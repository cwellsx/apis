using Core.Cecil;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal record CompilerGenerated(HashSet<int> Types, Dictionary<int, int> Methods)
    {
        internal static CompilerGenerated Transform(AssemblyData assemblyData)
        {
            // can use this to debug-trace a compiler method that's escaping into the Output
            var watch = ("XX Newtonsoft.Json", 100664323);
            var logFound = (MetadataToken token, string message) =>
            {
                if (watch.Item1 == assemblyData.Name && token.ToInt32() == watch.Item2)
                {
                    Logger.Log($"Found -- {message}");
                }
            };

            var allMethodData = assemblyData.MethodData
                // exclude the <>c class which is not really a static class, it's a singleton with a static constructor
                .Where(methodData => !methodData.IsLambdaCacheStaticCtor)
                .ToArray();

            // compiler types which are referenced via Newobj in methods
            // or via AsyncStateMachineAttribute or IteratorStateMachineAttribute
            var ownedCompilerTypes = allMethodData
                .SelectMany(methodData => methodData.OwnCompilerTypes
                .Select(typeDefinition => (methodData, typeDefinition))
                ).ToArray();

            // assert that resolvedTypes includes all compiler-generated types except the <>c class
            var ownCompilerTypeIds = new HashSet<MetadataToken>(ownedCompilerTypes.Select(t => t.typeDefinition.MetadataToken));
            var allCompilerTypes = assemblyData.GetTypeDefinitions(typeDefinition => typeDefinition.IsSignificantCompilerGenerated()).ToArray();
            if (allCompilerTypes.Any(typeDefinition => !ownCompilerTypeIds.Contains(typeDefinition.MetadataToken) && !typeDefinition.IsLambdaCache()))
            {
                throw new Exception("Some compiler-generated types were not resolved");
            }

            var ownedLambdaMethods = allMethodData
                // we want to know who's calling which methods of the <>c class
                // it's not really a static class, it's a singleton with a static constructor
                .SelectMany(ownerMethodData => ownerMethodData.OwnLamdaMethods
                .Select(ownLambdaMethod => (ownerMethodData, ownLambdaMethod))
                ).ToArray();

            var ownedLocalFunctions = allMethodData
                // we want to know who's calling which local functions
                .SelectMany(ownerMethodData => ownerMethodData.OwnLocalFunctions
                .Select(ownLocalFunction => (ownerMethodData, ownLocalFunction))
                ).ToArray();

            // assert that resolvedMethods includes all compiler-generated methods of the <>c class
            var allCompilerMethodIds = allCompilerTypes
                .Where(Predicates.IsLambdaCache)
                .SelectMany(typeDefinition => typeDefinition.Methods)
                .Where(methodDefinition => !methodDefinition.IsConstructor)
                .Select(methodDefinition => methodDefinition.MetadataToken)
                .ToHashSet();
            var ownedMethodIds = new HashSet<MetadataToken>(ownedLambdaMethods.Select(t => t.ownLambdaMethod.MetadataToken));
            if (!ownedMethodIds.SetEquals(allCompilerMethodIds))
            {
                throw new Exception("Some compiler-generated methods were not resolved");
            }

            //
            // ownedLambdaMethods -- key is compiler method, value is the user method which owns it
            //

            var mapMethods = ownedLambdaMethods.ToDictionary(
                pair => pair.ownLambdaMethod.MetadataToken,
                pair => pair.ownerMethodData
                );

            //
            // ownedCompilerTypes -- key is compiler type, value is the user method which owns it
            //

            var mapTypes = new Dictionary<MetadataToken, MethodData>();
            foreach (var (methodData, typeDefinition) in ownedCompilerTypes)
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
                /*
                 * There are two problems to resolve:
                 * - A type might be constructed from a user method and from a compiler-generated method
                 * - A type might be constructed only from a compiler-generated method
                 * In both cases we want to know which user method owns the compiler-generated method.
                 * Do it in two stages: first resolve each type; then verify that any duplicates agree.
                 */
                tryNeeded = false;
                tryUseful = false;
                foreach (var (methodData, typeDefinition) in ownedCompilerTypes)
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

                Assert(!tryNeeded || tryUseful, "Some compiler-generated types could not be resolved");

            } while (tryNeeded && tryUseful);

            if (tryNeeded)
            {
                throw new Exception();
            }

            //
            // ownedLocalFunctions
            //

            do
            {
                tryNeeded = false;
                tryUseful = false;
                foreach (var (ownerMethodData, ownLocalFunction) in ownedLocalFunctions)
                {
                    logFound(ownLocalFunction.MetadataToken, "owned in ownedLocalFunctions");
                    logFound(ownerMethodData.MetadataToken, "owner in ownedLocalFunctions");

                    if (mapMethods.ContainsKey(ownLocalFunction.MetadataToken))
                    {
                        continue;
                    }
                    if (!ownerMethodData.IsCompilerOrLocalFunction)
                    {
                        mapMethods.Add(ownLocalFunction.MetadataToken, ownerMethodData);
                        tryUseful = true;
                    }
                    else if (mapMethods.TryGetValue(ownerMethodData.MetadataToken, out var ownerOfCompilerMethod))
                    {
                        Assert(!ownerOfCompilerMethod.IsCompilerOrLocalFunction);
                        mapMethods.Add(ownLocalFunction.MetadataToken, ownerOfCompilerMethod);
                        tryUseful = true;
                    }
                    else if (mapTypes.TryGetValue(ownerMethodData.DeclaringType.MetadataToken, out var ownerOfCompilerType))
                    {
                        if (ownerOfCompilerType.IsLocalFunction)
                        {
                            // the owner of the compiler-generated type which calls this function is itself another local function
                            if (mapMethods.TryGetValue(ownerOfCompilerType.MetadataToken, out var trueOwner))
                            {
                                mapMethods.Add(ownLocalFunction.MetadataToken, trueOwner);
                            }
                            else
                            {
                                tryNeeded = true;
                            }
                            continue;
                        }
                        Assert(!ownerOfCompilerType.IsCompilerOrLocalFunction);
                        mapMethods.Add(ownLocalFunction.MetadataToken, ownerOfCompilerType);
                        tryUseful = true;
                    }
                    else
                    {
                        tryNeeded = true;
                    }
                }
            } while (tryNeeded && tryUseful);

            if (tryNeeded)
            {
                var missing = ownedLocalFunctions.Where(pair => !mapMethods.ContainsKey(pair.ownLocalFunction.MetadataToken));
                throw new Exception();
            }

            bool found = mapMethods.Keys.Any(key => key.ToInt32() == 100663686);

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
                if (!methodData.IsCompilerOrLocalFunction)
                {
                    return methodData;
                }
                if (methodData.IsLambdaOrLocalFunction)
                {
                    if (mapMethods.TryGetValue(methodData.MetadataToken, out var ownerMethodData))
                    {
                        if (ownerMethodData.IsLambdaOrLocalFunction)
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
                if (ownerMethodData.IsCompilerOrLocalFunction)
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
                Assert(!owner.IsCompilerOrLocalFunction);
                AddResult(compilerMethodDefinition, owner);
            }

            // none of the owners should themselves be compiler methods which MethodSummary.Transform will delete
            Assert(!result.Values.Any(value=>result.ContainsKey(value)));

            return new CompilerGenerated(
                ownedCompilerTypes.Select(pair => pair.typeDefinition.MetadataToken.ToInt32()).ToHashSet(),
                result);
        }
    }
}
