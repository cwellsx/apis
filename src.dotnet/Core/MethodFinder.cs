using Core.Extensions;
using Core.Output.Internal;
using Core.Output.Public;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core
{
    using AssemblyMethods = Dictionary<string, Dictionary<int, MethodDetails>>;
    using MethodDictionary = Dictionary<int, MethodDetails>;
    using AssemblyDecompiled = Dictionary<TypeIdEx, TypeDecompiled>;

    class MethodFinder
    {
        internal static AssemblyMethods GetAssemblyMethods(Dictionary<string, AssemblyDecompiled> assembliesDecompiled)
        {
            AssemblyMethods Dictionary = new AssemblyMethods();

            // create the targets first
            foreach (var (assembly, types) in assembliesDecompiled)
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
            foreach (var (assembly, types) in assembliesDecompiled)
            {
                var methodDictionary = Dictionary[assembly];
                foreach (var (typeId, typeMethods) in types)
                {
                    foreach (var decompiled in typeMethods.ListDecompiled)
                    {
                        var methodDetails = methodDictionary[decompiled.MetadataToken];
                        var caller = new CallDetails(typeId, decompiled);
                        foreach (var call in decompiled.CalledMethods)
                        {
                            if (call.DeclaringType.AssemblyName == null)
                            {
                                continue;
                            }
                            var callDetails = Find(call, assembliesDecompiled);
                            if (callDetails.MetadataToken.HasValue)
                            {
                                var found = Dictionary[callDetails.AssemblyName][callDetails.MetadataToken.Value];
                                found.CalledBy.Add(caller);
                            }
                            methodDetails.Called.Add(callDetails);
                        }
                        foreach (var call in decompiled.ArguedMethods)
                        {
                            if (call.DeclaringType.AssemblyName == null)
                            {
                                continue;
                            }
                            var callDetails = Find(call, assembliesDecompiled);
                            if (callDetails.MetadataToken.HasValue)
                            {
                                var found = Dictionary[callDetails.AssemblyName][callDetails.MetadataToken.Value];
                                found.ArguedBy.Add(caller);
                            }
                            methodDetails.Argued.Add(callDetails);
                        }
                    }
                }
            }

            return Dictionary;
        }

        private static CallDetails Find(MethodId call, Dictionary<string, AssemblyDecompiled> assembliesTypesDictionary)
        {
            CallDetails Error(string message)
            {
                var error = new Error(message, call);
                return new CallDetails(call, null, error);
            }

            CallDetails ErrorSome(string message, MethodMemberEx[] foundMethods)
            {
                var error = new Error(message, call, foundMethods);
                return new CallDetails(call, null, error);
            }
            CallDetails WarningSome(int metadataToken, string message, MethodMemberEx[] foundMethods)
            {
                var error = new Error(message, call, foundMethods);
                return new CallDetails(call, metadataToken, error);
            }

            CallDetails ErrorGeneric(string message, MethodMemberEx[] foundMethods, MethodMemberEx[] transformedMethods)
            {
                var error = new Error(message, call, foundMethods, transformedMethods);
                return new CallDetails(call, null, error);
            }
            CallDetails WarningGeneric(int metadataToken, string message, MethodMemberEx[] foundMethods, MethodMemberEx[] transformedMethods)
            {
                var error = new Error(message, call, foundMethods, transformedMethods);
                return new CallDetails(call, metadataToken, error);
            }

            if (call.DeclaringType.AssemblyName == null)
            {
                return Error("Missing AssemblyName");
            }
            if (!assembliesTypesDictionary.TryGetValue(call.DeclaringType.AssemblyName, out var typesDictionary))
            {
                return Error("Unknown AssemblyName");
            }
            if (!typesDictionary.TryGetValue(call.DeclaringType.WithoutArguments(), out var typeMethods))
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
#pragma warning disable CS0252 // Possible unintended reference comparison; left hand side needs cast
                var decompiled = listDecompiled.SingleOrDefault(d => d.MethodMember == call.MethodMember && d.GenericArguments == null);
#pragma warning restore CS0252 // Possible unintended reference comparison; left hand side needs cast
                if (decompiled != null)
                {
                    return new CallDetails(call, decompiled.MetadataToken, null);
                }

                var found = listDecompiled.Where(d => (
                    d.MethodMember.Name == call.MethodMember.Name &&
                    d.MethodMember.Access == call.MethodMember.Access &&
                    d.MethodMember.Parameters?.Length == call.MethodMember.Parameters?.Length
                )).ToArray();
                var foundMethods = found.Select(decompiled => decompiled.MethodMember).ToArray();
                switch (found.Length)
                {
                    case 0:
                        return Error("Unknown MethodMember");
                    case 1:
                        decompiled = found[0];
                        return WarningSome(decompiled.MetadataToken, "Approximate MethodMember", foundMethods);
                    default:
                        return ErrorSome("Call overloaded MethodMember", foundMethods);
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
                   var substitutions = GetSubstitutions(
                       decompiled.GenericArguments,
                       call.GenericMethodArguments,
                       genericTypeParameters,
                       call.GenericTypeArguments
                       );
                   return decompiled.MethodMember.Substitute(substitutions, assembliesTypesDictionary);
                };

                // find one single whose transformation is an exact match
                var decompiled = candidates.SingleOrDefault(decompiled => transform(decompiled) == call.MethodMember);
                if (decompiled != null)
                {
                    return new CallDetails(call, decompiled.MetadataToken, null);
                }

                // there's a slight (which I have tried to explain) cause of failure which would otherwise result in an "Approximate generic member" warning
                // which is that if the method belongs to a nested type of a generic type, and if the arguments in the call are generic parameters,
                // then the TypeId from the TypeReader has GenericTypeArguments on the method's DeclaringType but not on that nested type's DeclaringType
                // whereas the GenericTypeArguments are specified on both types in the call.MethodMember.DeclaringType
                // so to detect this scenario compare the two after removing all generic parameters (not arguments) from the DeclaringType of types
                var approximate = candidates.Where(decompiled => transform(decompiled).WithoutGenericParameters() == call.MethodMember.WithoutGenericParameters()).ToArray();
                if (approximate.Length == 1)
                {
                    return new CallDetails(call, approximate[0].MetadataToken, null);
                }
                var foundMethods = candidates.Select(decompiled => decompiled.MethodMember).ToArray();
                var transformedMethods = candidates.Select(transform).ToArray();

                switch (candidates.Length)
                {
                    case 0:
                        return Error("Unknown generic member");
                    case 1:
                        decompiled = candidates[0];
                        return WarningGeneric(decompiled.MetadataToken, "Approximate generic member", foundMethods, transformedMethods);
                    default:
                        return ErrorGeneric("Overloaded generic member", foundMethods, transformedMethods);
                }
            }
        }

        static Dictionary<string, TypeIdEx> GetSubstitutions(
            Values<TypeId>? genericMethodParameters,
            Values<TypeIdEx>? genericMethodArguments,
            Values<TypeId>? genericTypeParameters,
            Values<TypeIdEx>? genericTypeArguments
            )
        {
            // use just the Name as the key of the dictionary
            // the Name is a string like "T"
            // because the full TypeId of the argument also has a non-null DeclaringType
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
