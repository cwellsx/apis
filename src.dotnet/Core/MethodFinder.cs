using System;
using System.Collections.Generic;
using System.Linq;

namespace Core
{
    using MethodDictionary = Dictionary<int, MethodDetails>;
    using AssemblyMethods = Dictionary<string, Dictionary<int, MethodDetails>>;

    class MethodFinder
    {
        public AssemblyMethods Dictionary = new AssemblyMethods();

        internal void Finish(MethodReader methodReader)
        {
            // create the targets first
            foreach (var (assembly, types) in methodReader.Dictionary)
            {
                var methodDictionary = new MethodDictionary();
                Dictionary.Add(assembly, methodDictionary);
                foreach (var (typeId, typeMethods) in types)
                {
                    foreach (var (methodMember, decompiled) in typeMethods.MethodsDictionary)
                    {
                        methodDictionary.Add(decompiled.MetadataToken, new MethodDetails(decompiled.AsText));
                    }
                }
            }

            // iterate again to resolve the method calls
            foreach (var (assembly, types) in methodReader.Dictionary)
            {
                var methodDictionary = Dictionary[assembly];
                foreach (var (typeId, typeMethods) in types)
                {
                    foreach (var (methodMember, decompiled) in typeMethods.MethodsDictionary)
                    {
                        var methodDetails = methodDictionary[decompiled.MetadataToken];
                        var caller = new Method(typeId, methodMember, decompiled.MetadataToken);
                        foreach (var call in decompiled.Calls)
                        {
                            if (call.methodMember.IsConstructor == true)
                            {
                                continue;
                            }
                            var callDetails = Find(call, methodReader);
                            if (callDetails.Error == null || callDetails.IsWarning == true)
                            {
                                var called = callDetails.Called;
                                var found = Dictionary[called.AssemblyName][called.MetadataToken];
                                found.CalledBy.Add(caller);
                            }
                            methodDetails.Calls.Add(callDetails);
                        }
                    }
                }
            }
        }

        private static CallDetails Find(MethodReader.MethodId call, MethodReader methodReader)
        {
            var assemblyDictionary = methodReader.Dictionary;

            CallDetails Error(string message, params object[] more)
            {
                var error = new Error(message, call, more);
                return new CallDetails(call, error);
            }

            CallDetails Warning(int metadataToken, string message, params object[] more)
            {
                var error = new Error(message, call, more);
                return new CallDetails(call, error);
            }

            if (call.declaringType.AssemblyName == null)
            {
                return Error("Missing AssemblyName");
            }
            if (!assemblyDictionary.TryGetValue(call.declaringType.AssemblyName, out var typesDictionary))
            {
                return Error("Unknown AssemblyName");
            }
            TypeId declaringType = call.declaringType.WithoutArguments();
            if (!typesDictionary.TryGetValue(declaringType, out var typeMethods))
            {
                return Error("Call unknown TypeId");
            }

            var methodsDictionary = typeMethods.MethodsDictionary;
            var genericTypeParameters = typeMethods.GenericTypeParameters;

            if (genericTypeParameters?.Length != call.declaringType.GenericTypeArguments?.Length)
            {
                return Error("Mismatched genericTypeParameters");
            }

            // more-complicated method search if it's a generic type or a generic method
            bool isGeneric = (call.declaringType.GenericTypeArguments != null) || (call.methodMember.GenericArguments != null);

            if (!isGeneric)
            {
                if (methodsDictionary.TryGetValue(call.methodMember, out var decompiled))
                {
                    return new CallDetails(call, decompiled.MetadataToken);
                }

                var found = methodsDictionary.Keys.Where(key => (
                    key.Name == call.methodMember.Name &&
                    key.Access == call.methodMember.Access &&
                    key.Parameters?.Length == call.methodMember.Parameters?.Length
                )).ToArray();
                switch (found.Length)
                {
                    case 0:
                        return Error("Unknown MethodMember");
                    case 1:
                        var key = found[0];
                        return Warning(methodsDictionary[key].MetadataToken, "Approximate MethodMember", key);
                    default:
                        return Error("Call overloaded MethodMember", found);
                }
            }
            else
            {
                // can't find by key because actual (specialized) paramaters don't match generic parameters
                var found = methodsDictionary.Keys
                    .Where(key => key.GenericArguments?.Length == call.methodMember.GenericArguments?.Length
                    && key.Name == call.methodMember.Name
                    )
                    .ToArray();
                Func<MethodMember, MethodMember> withArguments = (methodMember) => methodMember.WithArguments(
                    call.methodMember.GenericArguments,
                    genericTypeParameters,
                    call.declaringType.GenericTypeArguments,
                    methodReader.IsMicrosoftAssemblyName
                    );
                var single = found.SingleOrDefault(key => call.methodMember == withArguments(key));
                if (single != null)
                {
                    return new CallDetails(call, methodsDictionary[single].MetadataToken);
                }
                switch (found.Length)
                {
                    case 0:
                        return Error("Unknown generic member");
                    case 1:
                        var key = found[0];
                        return Warning(methodsDictionary[key].MetadataToken, "Approximate generic member", key, withArguments(found[0]));
                    default:
                        return Error("Overloaded generic member", found);
                 }
            }
        }
    }
}
