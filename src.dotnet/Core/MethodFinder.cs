using System;
using System.Collections.Generic;
using System.Linq;

namespace Core
{
    using AssemblyMethods = Dictionary<string, Dictionary<int, MethodDetails>>;
    using MethodDictionary = Dictionary<int, MethodDetails>;

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
                    foreach (var decompiled in typeMethods.ListDecompiled)
                    {
                        methodDictionary.Add(decompiled.MetadataToken, decompiled.MethodDetails);
                    }
                }
            }

            // iterate again to resolve the method calls
            foreach (var (assembly, types) in methodReader.Dictionary)
            {
                var methodDictionary = Dictionary[assembly];
                foreach (var (typeId, typeMethods) in types)
                {
                    foreach (var decompiled in typeMethods.ListDecompiled)
                    {
                        var methodDetails = methodDictionary[decompiled.MetadataToken];
                        var caller = new Method(typeId, decompiled.MethodMember, decompiled.GenericArguments, decompiled.MetadataToken);
                        foreach (var call in decompiled.Calls)
                        {
                            if (call.declaringType.AssemblyName == null)
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

        private static CallDetails Find(MethodId call, MethodReader methodReader)
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
            if (!typesDictionary.TryGetValue(call.declaringType.WithoutArguments(), out var typeMethods))
            {
                return Error("Call unknown TypeId");
            }

            var listDecompiled = typeMethods.ListDecompiled;
            var genericTypeParameters = typeMethods.GenericTypeParameters;

            if (genericTypeParameters?.Length != call.GenericTypeArguments?.Length)
            {
                return Error("Mismatched genericTypeParameters");
            }

            // more-complicated method search if it's a generic type or a generic method
            bool isGeneric = (call.GenericTypeArguments != null) || (call.GenericMethodArguments != null);

            if (!isGeneric)
            {
                var decompiled = listDecompiled.SingleOrDefault(d => d.MethodMember == call.MethodMember);
                if (decompiled != null)
                {
                    return new CallDetails(call, decompiled.MetadataToken);
                }

                var found = listDecompiled.Where(d => (
                    d.MethodMember.Name == call.MethodMember.Name &&
                    d.MethodMember.Access == call.MethodMember.Access &&
                    d.MethodMember.Parameters?.Length == call.MethodMember.Parameters?.Length
                )).ToArray();
                switch (found.Length)
                {
                    case 0:
                        return Error("Unknown MethodMember");
                    case 1:
                        decompiled = found[0];
                        return Warning(decompiled.MetadataToken, "Approximate MethodMember", decompiled.MethodMember);
                    default:
                        return Error("Call overloaded MethodMember", found.Select(decompiled => decompiled.MethodMember).ToArray());
                }
            }
            else
            {
                // can't find by key yet because actual (specialized) parameters don't match generic parameters

                // get candidates
                var candidates = listDecompiled
                    .Where(d => d.MethodMember.Name == call.MethodMember.Name &&
                    d.GenericArguments?.Length == call.GenericMethodArguments?.Length)
                    .ToArray();

                // define how to transform
                Func<Decompiled, MethodMemberEx> transform = (decompiled) =>
               {
                   var transformation = GetTransformation(
                       decompiled.GenericArguments,
                       call.GenericMethodArguments,
                       genericTypeParameters,
                       call.GenericTypeArguments
                       );
                   return decompiled.MethodMember.Transform(transformation);
               };

                // find one single whose transformation is an exact match
                var decompiled = candidates.SingleOrDefault(decompiled => transform(decompiled) == call.MethodMember);
                if (decompiled != null)
                {
                    return new CallDetails(call, decompiled.MetadataToken);
                }

                // there's a slight (which I have tried to explain) cause of failure which would otherwise result in an "Approximate generic member" warning
                // which is that if the method belongs to a nested type of a generic type, and if the arguments in the call are generic parameters,
                // then the TypeId from the TypeReader has GenericTypeArguments on the method's DeclaringType but not on that nested type's DeclaringType
                // whereas the GenericTypeArguments are specified on both types in the call.MethodMember.DeclaringType
                // so to detect this scenario compare the two after removing all generic parameters (not arguments) from the DeclaringType of types
                var approximate = candidates.Where(decompiled => transform(decompiled).WithoutGenericParameters() == call.MethodMember.WithoutGenericParameters()).ToArray();
                if (approximate.Length == 1)
                {
                    return new CallDetails(call, approximate[0].MetadataToken);
                }

                switch (candidates.Length)
                {
                    case 0:
                        return Error("Unknown generic member");
                    case 1:
                        decompiled = candidates[0];
                        return Warning(decompiled.MetadataToken, "Approximate generic member", decompiled.MethodMember, transform(decompiled));
                    default:
                        return Error("Overloaded generic member", candidates.Select(decompiled => decompiled.MethodMember).ToArray());
                }
            }
        }

        static Dictionary<string, TypeIdEx> GetTransformation(
            Values<TypeId>? genericMethodParameters,
            Values<TypeIdEx>? genericMethodArguments,
            Values<TypeId>? genericTypeParameters,
            Values<TypeIdEx>? genericTypeArguments
            )
        {
            // use just the Name as the key of the dictionary
            // the Name is a string like "T"
            // because the full TypeId of the argument also hhas a non-null DeclaringType
            // except not when the argument is a type like "T[]"
            IEnumerable<KeyValuePair<string, TypeIdEx>> GetKvps(Values<TypeId>? parameters, Values<TypeIdEx>? arguments) =>
                Enumerable.Range(0, arguments?.Length ?? 0)
                .Select(i => new KeyValuePair<string, TypeIdEx>(
                    parameters![i].Name,
                    arguments![i]
                    ));

            var kvps = GetKvps(genericMethodParameters, genericMethodArguments)
                .Concat(GetKvps(genericTypeParameters, genericTypeArguments?.Array));

            return new Dictionary<string, TypeIdEx>(kvps);
        }
    }
}
