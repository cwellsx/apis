using System.Collections.Generic;
using System.Linq;

using Mono.Cecil;

namespace Core.Cecil
{
    internal class AssemblyData
    {
        private AssemblyDefinition _assemblyDefinition { get; }
        private Dictionary<MetadataToken, TypeData> _types { get; }

        internal AssemblyData(string path) : this(AssemblyDefinition.ReadAssembly(path))
        {
        }

        internal AssemblyData(AssemblyDefinition assemblyDefinition)
        {
            _assemblyDefinition = assemblyDefinition;
            _types = TypeData.ReadTypes(assemblyDefinition.MainModule.Types.Where(typeDefinition => typeDefinition.Name != "<Module>"));
        }

        internal string Name => _assemblyDefinition.Name.Name;

        internal int[] GetTypeMetadataTokens() => _types.Values.SelectMany(typeData => typeData.GetTypeMetadataTokens()).ToArray();

        internal MethodData[] GetMethodData() => _types.Values.SelectMany(typeData => typeData.GetMethodData()).ToArray();
    }
}
