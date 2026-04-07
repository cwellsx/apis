using System.Collections.Generic;
using System.Linq;
using Mono.Cecil;
using Core.Cecil;
using Core.Output;
using Core.Serializer;

namespace Core.CecilToOutput
{
    internal class Filtered : NameFromId
    {
        internal static All Iterate(All all, IEnumerable<AssemblyData> microsoft)
        {
            var result = new Dictionary<string, List<TypeInfo>>();
            var self = new Filtered(all, microsoft, result);

            all.ToYaml(self);

            while (self._added.Count > 0)
            {
                var added = self._added.ToArray();
                self._added.Clear();
                // visit every element of these too
                added.ToYaml(self);
            }

            var microsoftAssemblies = result.ToDictionary(
                kv => kv.Key,
                kv => new AssemblyInfo(
                    ReferencedAssemblies: [], // could but need not return referenced assemblies
                    TypeInfos: kv.Value.ToArray()
                    )
                );

            return all with { MicrosoftAssemblies = microsoftAssemblies };
        }

        readonly Dictionary<string, AssemblyData> _microsoftAssemblies;
        readonly Dictionary<string, Dictionary<int, TypeDefinition>> _microsoftTypes;
        readonly Dictionary<string, List<TypeInfo>> _result;
        readonly List<TypeInfo> _added = new List<TypeInfo>();

        internal Filtered(
            All all,
            IEnumerable<AssemblyData> microsoft,
            Dictionary<string, List<TypeInfo>> result
            ) : base(all)
        {
            _microsoftAssemblies = microsoft.ToDictionary(a => a.Name);
            _microsoftTypes = new Dictionary<string, Dictionary<int, TypeDefinition>>();
            _result = result;
        }

        protected override TypeInfo FetchTypeInfo(string assemblyName, int metadataToken)
        {
            if (!_microsoftTypes.ContainsKey(assemblyName))
            {
                var assemblyData = _microsoftAssemblies[assemblyName];
                var typeDefinitions = assemblyData.TypeDefinitions;
                _microsoftTypes.Add(assemblyName, typeDefinitions.ToDictionary(t => t.MetadataToken.ToInt32()));
                _result.Add(assemblyName, new List<TypeInfo>());
            }

            var typeDefinition = _microsoftTypes[assemblyName][metadataToken];
            var typeInfo = ToTypeInfo.Transform(typeDefinition, assemblyName, true);

            _result[assemblyName].Add(typeInfo);
            _added.Add(typeInfo);

            return typeInfo;
        }
    }
}
