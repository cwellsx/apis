using Core.Cecil;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal static class CompilerMethods
    {
        internal static Dictionary<int, int> Transform(AssemblyData assemblyData)
        {
            // compiler types which are referenced via Newobj in methods
            var resolvedTypes = assemblyData.MethodData
                // exclude the <>c class which is not really a static class, it's a singleton with a static constructor
                .Where(methodData => !methodData.IsLambdaCacheStaticCtor)
                .SelectMany(methodData => methodData.CompilerGeneratedTypes
                .Select(typeDefinition => (methodData, typeDefinition))
                ).ToArray();

            // assert that resolvedTypes includes all compiler-generated types except the <>c class
            var resolvedTypeIds = new HashSet<MetadataToken>(resolvedTypes.Select(t => t.typeDefinition.MetadataToken));
            var allCompilerTypes = assemblyData.TypeDefinitions.Where(Predicates.IsSignificantCompilerGenerated).ToArray();
            if (allCompilerTypes.Any(typeDefinition => !resolvedTypeIds.Contains(typeDefinition.MetadataToken) && !typeDefinition.IsLambdaCache()))
            {
                throw new Exception("Some compiler-generated types were not resolved");
            }

            var resolvedMethods = assemblyData.MethodData
                // we want to know whose calling which methods of the <>c class
                // it's not really a static class, it's a singleton with a static constructor
                .Where(methodData => !methodData.IsLambdaCacheStaticCtor)
                .SelectMany(ownerMethodData => ownerMethodData.CompilerGeneratedMethods
                .Select(compilerMethodDefinition => (ownerMethodData, compilerMethodDefinition))
                ).ToArray();

            // assert that resolvedMethods includes all compiler-generated methods of the <>c class
            var allCompilerMethodIds = allCompilerTypes
                .Where(Predicates.IsLambdaCache)
                .SelectMany(typeDefinition => typeDefinition.Methods)
                .Where(methodDefinition => !methodDefinition.IsConstructor)
                .Select(methodDefinition => methodDefinition.MetadataToken)
                .ToHashSet();
            var resolvedMethodIds = new HashSet<MetadataToken>(resolvedMethods.Select(t => t.compilerMethodDefinition.MetadataToken));
            if (!resolvedMethodIds.SetEquals(allCompilerMethodIds))
            {
                throw new Exception("Some compiler-generated methods were not resolved");
            }

            /*
             * There are two problems to resolve:
             * - A type might be constructed from a user method and from a compiler-generated method
             * - A type might be constructed only from a compiler-generated method
             * In both cases we want to know which user method owns the compiler-generated method.
             * Do it in two stages: first resolve each type; then verify that any duplicates agree.
             */

            // key is compiler type, value is the user method which owns it
            var mapMethods = resolvedMethods.ToDictionary(
                pair => pair.compilerMethodDefinition.MetadataToken,
                pair => pair.ownerMethodData
                );

            // key is compiler type, value is the user method which owns it
            var mapTypes = new Dictionary<MetadataToken, MethodData>();

            foreach (var (methodData, typeDefinition) in resolvedTypes)
            {
                if (!methodData.DeclaringType.IsCompilerGenerated())
                {
                    mapTypes.Add(typeDefinition.MetadataToken, methodData);
                }
                if (mapMethods.TryGetValue(methodData.MetadataToken, out var ownerMethodData))
                {
                    if (ownerMethodData.DeclaringType.IsCompilerGenerated())
                    {
                        throw new Exception();
                    }
                    mapTypes.Add(typeDefinition.MetadataToken, ownerMethodData);
                }
            }

            bool tryNeeded;
            bool tryUseful;
            do
            {
                tryNeeded = false;
                tryUseful = false;
                var generation = new Dictionary<MetadataToken, MetadataToken>();
                foreach (var (methodData, typeDefinition) in resolvedTypes)
                {
                    if (mapTypes.ContainsKey(typeDefinition.MetadataToken))
                    {
                        continue;
                    }

                    var declaringType = methodData.DeclaringType;
                    if (!declaringType.IsCompilerGenerated())
                    {
                        throw new Exception();
                    }

                    if (mapTypes.ContainsKey(declaringType.MetadataToken))
                    {
                        var userMethodId = mapTypes[declaringType.MetadataToken];
                        mapTypes.Add(typeDefinition.MetadataToken, userMethodId);
                        tryUseful = true;
                    }
                    else
                    {
                        tryNeeded = true;
                    }
                }

            } while (tryNeeded && tryUseful);

            MethodData GetTypeOwner(TypeDefinition typeDefinition)
            {
                if (mapTypes.TryGetValue(typeDefinition.MetadataToken, out var ownerMetadata))
                {
                    return ownerMetadata;
                }
                throw new Exception();
            }

            MethodData GetMethodOwner(MethodData methodData)
            {
                TypeDefinition typeDefinition = methodData.DeclaringType;
                if (!typeDefinition.IsCompilerGenerated())
                {
                    return methodData;
                }
                if (typeDefinition.IsLambdaCache())
                {
                    if (mapMethods.TryGetValue(methodData.MetadataToken, out var ownerMethodData))
                    {
                        return ownerMethodData;
                    }
                    throw new Exception();
                }
                return GetTypeOwner(typeDefinition);
            }

            if (tryNeeded)
            {
                throw new Exception();
            }

            var result = new Dictionary<int, int>();

            void AddResult(MethodDefinition compilerMethodDefinition, MethodData ownerMethodData)
            {
                if (!compilerMethodDefinition.DeclaringType.IsCompilerGenerated())
                {
                    throw new Exception();
                }
                if (ownerMethodData.DeclaringType.IsCompilerGenerated())
                {
                    throw new Exception();
                }
                result.Add(compilerMethodDefinition.MetadataToken.ToInt32(), ownerMethodData.MetadataToken.ToInt32());
            }

            var added = new HashSet<MetadataToken>();

            foreach (var typeDefinition in resolvedTypes.Select(pair => pair.typeDefinition))
            {
                // the same class can be called from more than one method, e.g. from a user method and from a compiler-generated method
                if (!added.Add(typeDefinition.MetadataToken))
                {
                    continue;
                }
                var owner = GetTypeOwner(typeDefinition);
                foreach (var methodDefinition in typeDefinition.Methods.Where(methodDefinition => !methodDefinition.IsConstructor()))
                {
                    AddResult(methodDefinition, owner);
                }
            }

            foreach (var (ownerMethodData, compilerMethodDefinition) in resolvedMethods)
            {
                var owner = GetMethodOwner(ownerMethodData);
                AddResult(compilerMethodDefinition, owner);
            }

            return result;
        }
    }
}
