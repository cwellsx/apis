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
        int _methodSpecMetadataToken = 0x2b000000;

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

        internal MethodSpecData GetMethodSpecData(int metadataToken)
        {
            return MethodSpecs[metadataToken];
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

        internal int AddMethodSpec(MethodSpecData methodSpecData)
        {
            var found = MethodSpecs.SingleOrDefault(kvp => Equals(kvp.Value, methodSpecData));
            if (found.Key != 0)
            {
                return found.Key;
            }
            var methodSpecId = ++_methodSpecMetadataToken;
            MethodSpecs.Add(methodSpecId, methodSpecData);
            return methodSpecId;
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

        private static bool Equals(MethodSpecData lhs, MethodSpecData rhs)
        {
            if (!s_TypeIdComparer.Equals(lhs.DeclaringType, rhs.DeclaringType))
            {
                return false;
            }
            if (!s_MethodIdComparer.Equals(lhs.Resolved, rhs.Resolved))
            {
                return false;
            }
            return (lhs.GenericMethodArguments == null)
                ? rhs.GenericMethodArguments == null
                : (rhs.GenericMethodArguments == null)
                ? false
                : lhs.GenericMethodArguments.SequenceEqual(rhs.GenericMethodArguments, s_TypeIdComparer);
        }

        private static readonly TypeIdComparer s_TypeIdComparer = new();
        private static readonly MethodIdComparer s_MethodIdComparer = new();
    }
}
