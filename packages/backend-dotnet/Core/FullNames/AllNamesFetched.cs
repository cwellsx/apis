using Core.Cecil;
using Core.CecilToOutput;
using Core.Output;
using Core.Serializer;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.FullNames
{
    internal class AllNamesFetched : AllNames
    {
        internal static All Iterate(All all, IEnumerable<AssemblyData> microsoft)
        {
            // TValue: TypeInfo, TCecil: TypeDefinition
            var fetchTypeInfos = new TwoDictionariesFetched<TypeInfo, TypeDefinition>(
                all,
                // Func<TypeInfo[], Dictionary<int, TValue>>
                s_typeInfoConverter,
                microsoft,
                // Func<AssemblyData, Dictionary<int, TCecil>>
                assemblyDataConverter: assemblyData => assemblyData.TypeDefinitions
                    .ToDictionary(typeDefinition => typeDefinition.MetadataToken.ToInt32()),
                // Func<TCecil, string, TValue>
                (typeDefinition, assemblyName) => ToTypeInfo.Transform(typeDefinition, assemblyName, true)
            );

            // TValue: MethodPair, TCecil: MethodDefinition
            var fetchMethodPairs = new TwoDictionariesFetched<MethodPair, MethodDefinition>(
                all,
                s_methodPairConverter,
                microsoft,
                // Func<AssemblyData, Dictionary<int, TCecil>>
                assemblyDataConverter: assemblyData => assemblyData.TypeDefinitions
                    .SelectMany(typeDefinition => typeDefinition.Methods)
                    .ToDictionary(methodDefinition => methodDefinition.MetadataToken.ToInt32()),
                // Func<TCecil, string, TValue>
                (methodDefinition, assemblyName) =>
                {
                    var typeMetadataToken = methodDefinition.DeclaringType.MetadataToken.ToInt32();
                    var typeInfo = fetchTypeInfos.Get(assemblyName, typeMetadataToken); // ensure the declaring type is fetched
                    var methodMember = ToTypeInfo.Transform(methodDefinition, assemblyName);
                    return new MethodPair(DeclaringType: typeInfo, MethodMember: methodMember);
                }
            );

            var self = new AllNamesFetched(fetchTypeInfos, fetchMethodPairs);

            all.ToYaml(self, false);

            while (fetchTypeInfos.Fetched.Count > 0 || fetchMethodPairs.Fetched.Count > 0)
            {
                var addedTypeInfos = new AssemblyMap<List<TypeInfo>>(fetchTypeInfos.Fetched);
                fetchTypeInfos.Fetched.Clear();
                // visit every element of these too
                addedTypeInfos.ToYaml(self, false);

                var addedMethodPairs = new AssemblyMap<List<MethodPair>>(fetchMethodPairs.Fetched);
                fetchMethodPairs.Fetched.Clear();
                // visit every element of these too
                addedMethodPairs.ToYaml(self, false);
            }

            var fetchedTypeInfos = fetchTypeInfos.GetMicrosoftValues();
            var fetchedMethodPairs = fetchMethodPairs.GetMicrosoftValues();

            Assert(fetchedTypeInfos.Values.All(typeInfos => typeInfos.All(typeInfo => typeInfo.MethodMembers == null)));

            var fetchedMethodMembers = fetchedMethodPairs.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value
                .GroupBy(methodPair => methodPair.DeclaringType.Id.LeafId.MetadataToken)
                .ToDictionary(
                    methodPairGroup => methodPairGroup.Key,
                    methodPairGroup => methodPairGroup.Select(methodPair => methodPair.MethodMember).ToArray()
                    )
                );

            Func<string, int, MethodMember[]?> getMethodMembers = (assemblyName, id) =>
            {
                if (fetchedMethodMembers.TryGetValue(assemblyName, out var assemblyMethodMembers) && assemblyMethodMembers.TryGetValue(id, out var methodMembers))
                {
                    return methodMembers;
                }
                return null;
            };

            var microsoftAssemblies = new AssemblyMap<AssemblyInfo>(fetchedTypeInfos.ToDictionary(
                kvp => kvp.Key,
                kvp => new AssemblyInfo(
                    ReferencedAssemblies: [], // could but need not return referenced assemblies
                    TypeInfos: kvp.Value.Select(typeInfo =>
                    {
                        var methodMembers = getMethodMembers(kvp.Key, typeInfo.Id.LeafId.MetadataToken);
                        return typeInfo with { MethodMembers = methodMembers };
                    }).ToArray()
                    )
                ));

            //var microsoftAssemblies = new AssemblyMap<AssemblyInfo>();

            return all with { MicrosoftAssemblies = microsoftAssemblies };
        }

        AllNamesFetched(
            TwoDictionariesFetched<TypeInfo, TypeDefinition> fetchTypeInfos,
            TwoDictionariesFetched<MethodPair, MethodDefinition> fetchMethodPairs
            )
            : base(fetchTypeInfos, fetchMethodPairs)
        {
        }
    }
}
