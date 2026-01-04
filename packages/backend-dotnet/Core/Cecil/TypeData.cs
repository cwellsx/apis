using System.Collections.Generic;
using System.Linq;

using Mono.Cecil;

namespace Core.Cecil
{
    internal class TypeData
    {
        internal TypeDefinition[] TypeDefinitions { get; }
        internal MethodData[] Methods { get; }

        internal TypeData(TypeDefinition typeDefinition)
        {
            TypeDefinitions = GetAllTypeDefinitions(typeDefinition).ToArray();
            Methods = TypeDefinitions
                .SelectMany(typeDefinition => typeDefinition.Methods)
                .Select(methodDefinition => new MethodData(methodDefinition))
                .ToArray();
        }

        private static IEnumerable<TypeDefinition> GetAllTypeDefinitions(TypeDefinition typeDefinition)
        {
            yield return typeDefinition;
            foreach (var nestedType in typeDefinition.NestedTypes)
            {
                foreach (var child in GetAllTypeDefinitions(nestedType))
                    yield return child;
            }
        }
    }
}
