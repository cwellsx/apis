using Core.Cecil;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;
using Core.CecilToLifted.Private;

namespace Core.CecilToLifted
{
    internal record OwnedMethodMaps(
        Dictionary<MetadataToken, MethodData> MapTypes,
        Dictionary<MetadataToken, MethodData> MapMethods
    )
    {
        internal static OwnedMethodMaps FromOwnedMethods(OwnedMethods ownedMethods, Action<MetadataToken, string> logFound)
        {
            var (ownedCompilerTypes, ownedLambdaMethods, ownedLocalFunctions) = ownedMethods;

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
                    if (!ownerMethodData.IsCompilerOrLocalFunction())
                    {
                        mapMethods.Add(ownLocalFunction.MetadataToken, ownerMethodData);
                        tryUseful = true;
                    }
                    else if (mapMethods.TryGetValue(ownerMethodData.MetadataToken, out var ownerOfCompilerMethod))
                    {
                        Assert(!ownerOfCompilerMethod.IsCompilerOrLocalFunction());
                        mapMethods.Add(ownLocalFunction.MetadataToken, ownerOfCompilerMethod);
                        tryUseful = true;
                    }
                    else if (mapTypes.TryGetValue(ownerMethodData.DeclaringType.MetadataToken, out var ownerOfCompilerType))
                    {
                        if (ownerOfCompilerType.IsLocalFunction())
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
                        Assert(!ownerOfCompilerType.IsCompilerOrLocalFunction());
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

            return new OwnedMethodMaps(mapTypes, mapMethods);
        }
    }
}
