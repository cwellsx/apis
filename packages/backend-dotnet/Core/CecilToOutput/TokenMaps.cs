using Core.Id.Comparers;
using Core.Id.Types;
using Core.Output;
using Core.Output.Ids;
using System.Linq;

namespace Core.CecilToOutput
{
    internal record TokenMaps(TokenMap<TypeSpecData> TypeSpecs, TokenMap<MethodSpecData> MethodSpecs)
    {
        int _typeSpecMetadataToken = 0x1b000000;

        static internal TokenMaps CreateNew() => new TokenMaps(new TokenMap<TypeSpecData>(), new TokenMap<MethodSpecData>());

        // similar to TypeSpecData but with the Resolved as a BaseTypeId instead of a TypeId
        internal record TypeSpec(IBaseTypeId Resolved, ITypeId[]? GenericTypeArguments, string? Suffix);

        internal TypeSpec GetTypeSpec(int metadataToken)
        {
            var result = TypeSpecs[metadataToken];
            while (result.Resolved is not IBaseTypeId)
            {
                var specificationType = (SpecificationType)result.Resolved;
                var baseResult = TypeSpecs[specificationType.MetadataToken];
                Assert(result.GenericTypeArguments == null || baseResult.GenericTypeArguments == null);
                result = new TypeSpecData(
                    baseResult.Resolved,
                    result.GenericTypeArguments ?? baseResult.GenericTypeArguments,
                    baseResult.Suffix + result.Suffix
                    );
            }
            return new TypeSpec((IBaseTypeId)result.Resolved, result.GenericTypeArguments, result.Suffix);
        }

        internal int AddTypeSpec(TypeSpecData typeSpecData)
        {
            var found = TypeSpecs.SingleOrDefault(kvp => Equals(kvp.Value, typeSpecData));
            if (found.Key != 0)
            {
                return found.Key;
            }
            var typeSpecId = ++_typeSpecMetadataToken;
            TypeSpecs.Add(typeSpecId, typeSpecData);
            return typeSpecId;
        }

        private static bool Equals(TypeSpecData lhs, TypeSpecData rhs)
        {
            if (!s_TypeIdComparer.Equals(lhs.Resolved, rhs.Resolved))
            {
                return false;
            }
            if (lhs.Suffix != rhs.Suffix)
            {
                return false;
            }
            return (lhs.GenericTypeArguments == null)
                ? rhs.GenericTypeArguments == null
                : (rhs.GenericTypeArguments == null)
                ? false
                : lhs.GenericTypeArguments.SequenceEqual(rhs.GenericTypeArguments, s_TypeIdComparer);
        }

        private static readonly TypeIdComparer s_TypeIdComparer = new();
    }
}
