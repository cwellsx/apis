using System;
using System.Collections.Generic;
using System.Linq;

namespace Core
{
    using MethodDictionary = Dictionary<string, MethodDetails>;
    using TypeDictionary = Dictionary<string, Dictionary<string, MethodDetails>>;
    using AssemblyDictionary = Dictionary<string, Dictionary<string, Dictionary<string, MethodDetails>>>;

    class MethodFinder
    {
        public AssemblyDictionary Dictionary = new AssemblyDictionary();

        internal void Finish(MethodReader methodReader)
        {
            // create the targets first
            foreach (var (assembly, types) in methodReader.Dictionary)
            {
                var typeDictionary = new TypeDictionary();
                Dictionary.Add(assembly, typeDictionary);
                foreach (var (typeId, typeMethods) in types)
                {
                    var methodDictionary = new MethodDictionary();
                    typeDictionary.Add(typeId.AsString(false), methodDictionary);
                    foreach (var (methodMember, decompiled) in typeMethods.MethodsDictionary)
                    {
                        methodDictionary.Add(methodMember.AsString(false), new MethodDetails(decompiled.AsText));
                    }
                }
            }

            // iterate again to resolve the method calls
            foreach (var (assembly, types) in methodReader.Dictionary)
            {
                var typeDictionary = Dictionary[assembly];
                foreach (var (typeId, typeMethods) in types)
                {
                    var methodDictionary = typeDictionary[typeId.AsString(false)];
                    foreach (var (methodMember, decompiled) in typeMethods.MethodsDictionary)
                    {
                        var methodDetails = methodDictionary[methodMember.AsString(false)];
                        var caller = new MethodId(methodMember, typeId).AsString();
                        foreach (var call in decompiled.Calls)
                        {
                            var callDetails = Find(call, methodReader);
                            if (callDetails.Error == null || callDetails.IsWarning == true)
                            {
                                var called = callDetails.Generic ?? callDetails.Called;
                                var found = Dictionary
                                    [called.AssemblyName]
                                    [called.DeclaringType]
                                    [called.MethodMember];
                                found.CalledBy.Add(caller);
                                methodDetails.Calls.Add(callDetails);
                            }
                        }
                    }
                }
            }
        }

        private static CallDetails Find(MethodId call, MethodReader methodReader)
        {
            var assemblyDictionary = methodReader.Dictionary;
            var result = new CallDetails(call.AsString(), null, null, null);

            void Error(string message, params object[] more)
            {
                result.Error = new Error(message, call, more);
            }

            void Warning(string message, params object[] more)
            {
                Error(message,  more);
                result.IsWarning = true;
            }

            bool Assert(bool b, string message, params object[] more)
            {
                if (!b)
                {
                    // to debug this error, visually compare Core.json with Methods.json 
                    Error(message, more);
                }
                return b;
            }

            TypeId declaringType;

            if (
                !Assert(call.declaringType.AssemblyName != null, "Missing AssemblyName") ||
                !Assert(assemblyDictionary.TryGetValue(call.declaringType.AssemblyName!, out var typesDictionary), "Unknown AssemblyName") ||
                !Assert(typesDictionary!.TryGetValue(declaringType = call.declaringType.WithoutArguments(), out var typeMethods), "Call unknown TypeId")
                )
            {
                return result;
            }

            var methodsDictionary = typeMethods!.MethodsDictionary;
            var genericTypeParameters = typeMethods.GenericTypeParameters;
            if (!Assert(genericTypeParameters?.Length == call.declaringType.GenericTypeArguments?.Length, "Mismatched genericTypeParameters"))
            {
                return result;
            }

            // more-complicated method search if it's a generic type or a generic method
            bool isGeneric = (call.declaringType.GenericTypeArguments != null) || (call.methodMember.GenericArguments != null);

            if (!isGeneric)
            {
                if (methodsDictionary!.ContainsKey(call.methodMember))
                {
                    return result;
                }

                var found = methodsDictionary!.Keys.Where(key => (
                    key.Name == call.methodMember.Name &&
                    key.Access == call.methodMember.Access &&
                    key.Parameters?.Length == call.methodMember.Parameters?.Length
                )).ToArray();
                switch (found.Length)
                {
                    case 0:
                        Error("Unknown MethodMember");
                        break;
                    case 1:
                        Warning("Approximate MethodMember", found);
                        break;
                    default:
                        Error("Call overloaded MethodMember", found);
                        break;
                }
                return result;
            }
            else
            {
                // can't find by key because actual (specialized) paramaters don't match generic parameters
                var found = methodsDictionary!.Keys
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
                    result.Generic = new MethodId(single, declaringType).AsString();
                    return result;
                }
                switch (found.Length)
                {
                    case 0:
                        Error("Unknown generic member");
                        break;
                    case 1:
                        Warning("Approximate generic member", found[0], withArguments(found[0]));
                        result.Generic = new MethodId(found[0], declaringType).AsString();
                        break;
                    default:
                        Error("Overloaded generic member", found);
                        break;
   }
            }
            return result;
        }
    }
}
