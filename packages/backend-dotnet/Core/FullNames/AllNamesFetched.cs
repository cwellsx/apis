using Core.Cecil;
using Core.CecilToOutput;
using Core.Output;
using Core.Serializer;
using Mono.Cecil;
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
                typeInfoConverter: typeInfos => typeInfos.ToDictionary(typeInfo => typeInfo.Id.LeafId.MetadataToken),
                microsoft,
                // Func<AssemblyData, Dictionary<int, TCecil>>
                assemblyDataConverter: assemblyData => assemblyData.TypeDefinitions.ToDictionary(td => td.MetadataToken.ToInt32()),
                // Func<TCecil, string, TValue>
                (typeDefinition, assemblyName) => ToTypeInfo.Transform(typeDefinition, assemblyName, true)
            );

            var self = new AllNamesFetched(all, fetchTypeInfos);

            all.ToYaml(self);

            while (fetchTypeInfos.Fetched.Count > 0)
            {
                var added = new AssemblyMap<List<TypeInfo>>(fetchTypeInfos.Fetched);
                fetchTypeInfos.Fetched.Clear();
                // visit every element of these too
                added.ToYaml(self);
            }

            var results = fetchTypeInfos.GetMicrosoft();

            var microsoftAssemblies = new AssemblyMap<AssemblyInfo>(results.ToDictionary(
                result => result.AssemblyName,
                result => new AssemblyInfo(
                    ReferencedAssemblies: [], // could but need not return referenced assemblies
                    TypeInfos: result.Values
                    )
                ));

            return all with { MicrosoftAssemblies = microsoftAssemblies };
        }

        AllNamesFetched(All all, TwoDictionariesFetched<TypeInfo, TypeDefinition> fetchTypeInfos)
            : base(all, fetchTypeInfos)
        {
        }
    }
}
