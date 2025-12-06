using System.Collections.Generic;
using System.Linq;

using Mono.Cecil;

namespace Core.Cecil
{
    internal class TypeData
    {
        private TypeDefinition TypeDefinition { get; }
        private Dictionary<MetadataToken, TypeData> NestedTypes { get; }
        private Dictionary<MetadataToken, MethodData> Methods { get; } = [];

        internal TypeData(TypeDefinition typeDefinition)
        {
            TypeDefinition = typeDefinition;

            NestedTypes = (typeDefinition.HasNestedTypes) ? ReadTypes(typeDefinition.NestedTypes) : [];

            foreach (var methodDefinition in typeDefinition.Methods)
            {
                Methods.Add(methodDefinition.MetadataToken, new MethodData(methodDefinition));
            }
        }

        internal IEnumerable<int> GetTypeMetadataTokens()
        {
            return NestedTypes.Values.SelectMany(nt => nt.GetTypeMetadataTokens())
                .Append(TypeDefinition.MetadataToken.ToInt32());
        }

        internal IEnumerable<MethodData> GetMethodData()
        {
            return NestedTypes.Values.SelectMany(nt => nt.GetMethodData())
                .Concat(Methods.Values);
        }

        internal static Dictionary<MetadataToken, TypeData> ReadTypes(IEnumerable<TypeDefinition> fromTypes)
        {
            var result = new Dictionary<MetadataToken, TypeData>();
            foreach (var typeDefinition in fromTypes)
            {
                result.Add(typeDefinition.MetadataToken, new TypeData(typeDefinition));
            }
            return result;
        }
    }
}
