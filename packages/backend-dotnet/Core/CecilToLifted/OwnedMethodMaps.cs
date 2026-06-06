using Core.Cecil;
using Core.CecilToLifted.Private;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToLifted
{
    internal record OwnedMethodMaps(
        Dictionary<MetadataToken, MethodData> MapCompilerTypes, // created from ownedCompilerTypes
        Dictionary<MetadataToken, MethodData> MapLambdaMethods, // created from ownedLambdaMethods
        Dictionary<MetadataToken, MethodData> MapGenericTypes
    )
    {
        internal static OwnedMethodMaps FromOwnedMethods(OwnedMethods ownedMethods, Action<MetadataToken, string> logFound)
        {
            var (ownedCompilerTypes, ownedLambdaMethods, ownedLocalFunctions) = ownedMethods;

            foreach (var metadataToken in ownedCompilerTypes.Select(value => value.typeDefinition.MetadataToken))
            {
                logFound(metadataToken, "ownedCompilerTypes");
            }
            foreach (var metadataToken in ownedLambdaMethods.Select(value => value.ownLambdaMethod.DeclaringType.MetadataToken))
            {
                logFound(metadataToken, "ownedLambdaMethods");
            }

            var mapLambdaMethods = ownedLambdaMethods.ToDictionary(
                pair => pair.ownLambdaMethod.MetadataToken,
                pair => pair.ownerMethodData
                );

            var mapGenericTypes = new Dictionary<MetadataToken, MethodData>();

            void AddGenericType(TypeDefinition genericType, MethodData methodData)
            {
                if (methodData.DeclaringType == genericType)
                {
                    // type is being called by one of its own methods -- doesn't count as ownership
                    return;
                }
                logFound(genericType.MetadataToken, "AddGenericType");

                if (!mapGenericTypes.TryGetValue(genericType.MetadataToken, out var existingOwner))
                {
                    mapGenericTypes[genericType.MetadataToken] = methodData;
                }
                else
                {
                    Assert(existingOwner.MetadataToken == methodData.MetadataToken, "Generic type is owned by two different methods");
                }
            }

            foreach (var value in ownedLambdaMethods)
            {
                var lambdaType = value.ownLambdaMethod.DeclaringType;
                if (!lambdaType.IsGenericLambdaCache())
                {
                    continue;
                }
                AddGenericType(lambdaType, value.ownerMethodData);
            }
            foreach (var value in ownedCompilerTypes)
            {
                var typeDefinition = value.typeDefinition;
                if (!typeDefinition.IsGenericDisplayClass() && !typeDefinition.IsGenericIteratorState())
                {
                    continue;
                }
                AddGenericType(typeDefinition, value.ownerMethodData);
            }

            //
            // ownedCompilerTypes -- key is compiler type, value is the user method which owns it
            //

            var mapCompilerTypes = new Dictionary<MetadataToken, MethodData>();
            foreach (var (methodData, typeDefinition) in ownedCompilerTypes)
            {
                if (!methodData.DeclaringType.IsCompilerGenerated())
                {
                    mapCompilerTypes.Add(typeDefinition.MetadataToken, methodData);
                }
                if (mapLambdaMethods.TryGetValue(methodData.MetadataToken, out var ownerMethodData))
                {
                    if (ownerMethodData.DeclaringType.IsCompilerGenerated())
                    {
                        throw new Exception();
                    }
                    mapCompilerTypes.Add(typeDefinition.MetadataToken, ownerMethodData);
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
                    if (mapCompilerTypes.ContainsKey(typeDefinition.MetadataToken))
                    {
                        continue;
                    }

                    var declaringType = methodData.DeclaringType;
                    if (!declaringType.IsCompilerGenerated())
                    {
                        throw new Exception();
                    }

                    if (mapCompilerTypes.ContainsKey(declaringType.MetadataToken))
                    {
                        var userMethodId = mapCompilerTypes[declaringType.MetadataToken];
                        mapCompilerTypes.Add(typeDefinition.MetadataToken, userMethodId);
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

                    if (mapLambdaMethods.ContainsKey(ownLocalFunction.MetadataToken))
                    {
                        continue;
                    }
                    if (!ownerMethodData.IsCompilerOrLocalFunction())
                    {
                        mapLambdaMethods.Add(ownLocalFunction.MetadataToken, ownerMethodData);
                        tryUseful = true;
                    }
                    else if (mapLambdaMethods.TryGetValue(ownerMethodData.MetadataToken, out var ownerOfCompilerMethod))
                    {
                        Assert(!ownerOfCompilerMethod.IsCompilerOrLocalFunction());
                        mapLambdaMethods.Add(ownLocalFunction.MetadataToken, ownerOfCompilerMethod);
                        tryUseful = true;
                    }
                    else if (mapCompilerTypes.TryGetValue(ownerMethodData.DeclaringType.MetadataToken, out var ownerOfCompilerType))
                    {
                        if (ownerOfCompilerType.IsLocalFunction())
                        {
                            // the owner of the compiler-generated type which calls this function is itself another local function
                            if (mapLambdaMethods.TryGetValue(ownerOfCompilerType.MetadataToken, out var trueOwner))
                            {
                                mapLambdaMethods.Add(ownLocalFunction.MetadataToken, trueOwner);
                            }
                            else
                            {
                                tryNeeded = true;
                            }
                            continue;
                        }
                        Assert(!ownerOfCompilerType.IsCompilerOrLocalFunction());
                        mapLambdaMethods.Add(ownLocalFunction.MetadataToken, ownerOfCompilerType);
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
                var missing = ownedLocalFunctions.Where(pair => !mapLambdaMethods.ContainsKey(pair.ownLocalFunction.MetadataToken));
                throw new Exception();
            }

            return new OwnedMethodMaps(mapCompilerTypes, mapLambdaMethods, mapGenericTypes);
        }
    }
}
