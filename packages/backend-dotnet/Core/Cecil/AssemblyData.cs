using Mono.Cecil;
using System;
using System.Linq;
using Core.Loader;
using System.Collections.Generic;

namespace Core.Cecil
{
    internal sealed class AssemblyData : IDisposable
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

        internal AssemblyReference[] AssemblyReferences => AssemblyDefinition.MainModule.AssemblyReferences
            .Select(assemblyNameReference => new AssemblyReference(assemblyNameReference))
            .ToArray();

        internal TypeDefinition[] TypeDefinitions => GetTypeDefinitions(Predicates.IsNotCompilerGenerated).ToArray();

        internal IEnumerable<TypeDefinition> GetTypeDefinitions(Func<TypeDefinition, bool> predicate) => _types.Value
            .SelectMany(typeData => typeData.TypeDefinitions)
            .Where(predicate);

        internal MethodData[] MethodData => _types.Value.SelectMany(typeData => typeData.Methods).ToArray();

        public void Dispose()
        {
            AssemblyDefinition.Dispose();
        }
    }
}
