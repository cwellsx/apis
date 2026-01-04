using Mono.Cecil;
using System;
using System.Linq;

namespace Core.Cecil
{
    internal class AssemblyData
    {
        internal AssemblyDefinition AssemblyDefinition { get; }
        private Lazy<TypeData[]> _types { get; }

        internal AssemblyData(AssemblyDefinition assemblyDefinition)
        {
            AssemblyDefinition = assemblyDefinition;
            _types = new Lazy<TypeData[]>(() => assemblyDefinition.MainModule.Types
                .Where(typeDefinition => typeDefinition.Name != "<Module>")
                .Select(typeDefinition => new TypeData(typeDefinition))
                .ToArray());
        }

        internal string Name => AssemblyDefinition.Name.Name;

        internal Core.Loader.AssemblyReference[] AssemblyReferences => AssemblyDefinition.MainModule.AssemblyReferences
            .Select(assemblyNameReference => new Core.Loader.AssemblyReference(assemblyNameReference))
            .ToArray();

        internal TypeDefinition[] TypeDefinitions => _types.Value.SelectMany(typeData => typeData.TypeDefinitions).ToArray();

        internal MethodData[] MethodData => _types.Value.SelectMany(typeData => typeData.Methods).ToArray();
    }
}
