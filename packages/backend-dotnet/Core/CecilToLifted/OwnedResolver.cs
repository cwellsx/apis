using Core.Cecil;
using Core.CecilToLifted.Private;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToLifted
{
    internal static class OwnedResolver
    {
        internal static CompilerGenerated FromOwned(string assemblyName, OwnedMethods ownedMethods, OwnedMethodMaps ownedMethodMaps, Action<MetadataToken, string> logFound)
        {
            var (ownedCompilerTypes, ownedLambdaMethods, ownedLocalFunctions) = ownedMethods;
            var (mapCompilerTypes, mapLambdaMethods, mapGenericTypes) = ownedMethodMaps;

            MethodData GetTypeOwner(TypeDefinition typeDefinition)
            {
                if (mapCompilerTypes.TryGetValue(typeDefinition.MetadataToken, out var ownerMetadata))
                {
                    return ownerMetadata;
                }
                throw new Exception();
            }

            MethodData GetMethodOwner(MethodData methodData)
            {
                TypeDefinition typeDefinition = methodData.DeclaringType;
                if (!methodData.IsCompilerOrLocalFunction())
                {
                    return methodData;
                }
                if (methodData.IsLambdaOrLocalFunction())
                {
                    if (mapLambdaMethods.TryGetValue(methodData.MetadataToken, out var ownerMethodData))
                    {
                        if (ownerMethodData.IsLambdaOrLocalFunction())
                        {
                            return GetMethodOwner(ownerMethodData);
                        }
                        return ownerMethodData;
                    }
                    throw new Exception();
                }
                else
                {
                    var typeOwner = GetTypeOwner(typeDefinition);
                    return GetMethodOwner(typeOwner);
                }
            }

            var result = new Dictionary<int, int>();

            void AddResult(MethodDefinition compilerMethodDefinition, MethodData ownerMethodData)
            {
                if (!compilerMethodDefinition.DeclaringType.IsCompilerGenerated() &&
                    !compilerMethodDefinition.IsLocalFunction())
                {
                    throw new Exception();
                }
                if (ownerMethodData.IsCompilerOrLocalFunction())
                {
                    Logger.Log("");
                    Logger.Log(compilerMethodDefinition.MetadataToken.ToInt32().ToString());
                    Logger.Log(compilerMethodDefinition.FullName);
                    Logger.Log(ownerMethodData.MetadataToken.ToInt32().ToString());
                    Logger.Log(ownerMethodData.FullName);
                    throw new Exception();
                }

                logFound(compilerMethodDefinition.MetadataToken, "owned in AddResult");
                logFound(ownerMethodData.MetadataToken, "owner in AddResult");

                result.Add(compilerMethodDefinition.MetadataToken.ToInt32(), ownerMethodData.MetadataToken.ToInt32());
            }

            var added = new HashSet<MetadataToken>();

            foreach (var typeDefinition in ownedCompilerTypes.Select(pair => pair.typeDefinition))
            {
                // the same class can be called from more than one method, e.g. from a user method and from a compiler-generated method
                if (!added.Add(typeDefinition.MetadataToken))
                {
                    continue;
                }
                var owner = GetTypeOwner(typeDefinition);
                owner = GetMethodOwner(owner);
                foreach (var methodDefinition in typeDefinition.Methods)
                {
                    AddResult(methodDefinition, owner);
                }
            }

            foreach (var (ownerMethodData, compilerMethodDefinition) in ownedLambdaMethods)
            {
                var owner = GetMethodOwner(ownerMethodData);
                AddResult(compilerMethodDefinition, owner);
            }

            foreach (var (ownerMethodData, compilerMethodDefinition) in ownedLocalFunctions)
            {
                if (result.ContainsKey(compilerMethodDefinition.MetadataToken.ToInt32()))
                {
                    continue;
                }
                var owner = GetMethodOwner(ownerMethodData);
                Assert(!owner.IsCompilerOrLocalFunction());
                AddResult(compilerMethodDefinition, owner);
            }

            // none of the owners should themselves be compiler methods which MethodSummary.Transform will delete
            Assert(!result.Values.Any(value => result.ContainsKey(value)));

            return new CompilerGenerated(
                assemblyName,
                ownedCompilerTypes.Select(pair => pair.typeDefinition.MetadataToken.ToInt32()).ToHashSet(),
                result,
                mapGenericTypes
                );
        }
    }
}
