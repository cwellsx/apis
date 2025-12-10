using System.Collections.Generic;
using System.Linq;

using Mono.Cecil;

namespace Core.Cecil
{
    internal class AssemblyData
    {
        private AssemblyDefinition _assemblyDefinition { get; }
        private TypeData[] _types { get; }

        internal AssemblyData(AssemblyDefinition assemblyDefinition)
        {
            _assemblyDefinition = assemblyDefinition;
            _types = assemblyDefinition.MainModule.Types
                .Where(typeDefinition => typeDefinition.Name != "<Module>")
                .Select(typeDefinition => new TypeData(typeDefinition))
                .ToArray();
        }

        internal string Name => _assemblyDefinition.Name.Name;

        internal TypeDefinition[] TypeDefinitions => _types.SelectMany(typeData => typeData.AllTypeDefinitions).ToArray();

        internal MethodData[] MethodData => _types.SelectMany(typeData => typeData.AllMethodData).ToArray();
    }
}
