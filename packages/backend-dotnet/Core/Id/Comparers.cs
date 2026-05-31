using Core.Id.Methods;
using Core.Id.Types;
using Core.Output.Ids;
using System;
using System.Collections.Generic;

namespace Core.Id.Comparers
{
    public sealed class FullMethodIdComparer : IEqualityComparer<MethodId>
    {
        private static readonly MethodIdComparer s_MethodIdComparer = new();
        public bool Equals(MethodId? x, MethodId? y)
        {
            if (ReferenceEquals(x, y)) return true;
            if (x is null || y is null) return false;
            return s_MethodIdComparer.Equals(x.LeafId, y.LeafId);
        }
        public int GetHashCode(MethodId obj) => s_MethodIdComparer.GetHashCode(obj.LeafId);
    }

    public sealed class MethodIdComparer : IEqualityComparer<IMethodId>
    {
        private static readonly TypeIdComparer s_TypeIdComparer = new();

        public bool Equals(IMethodId? x, IMethodId? y)
        {
            if (ReferenceEquals(x, y)) return true;
            if (x is null || y is null) return false;

            return (x, y) switch
            {
                (LocalMethod a, LocalMethod b) =>
                    a.MetadataToken == b.MetadataToken,

                (RemoteMethod a, RemoteMethod b) =>
                    a.AssemblyName == b.AssemblyName &&
                    a.MetadataToken == b.MetadataToken,

                (GenericMethod a, GenericMethod b) =>
                    Equals(a.MetadataToken, b.MetadataToken),

                _ => false
            };
        }

        public int GetHashCode(IMethodId obj) =>
            obj switch
            {
                LocalMethod m => HashCode.Combine("local", m.MetadataToken),
                RemoteMethod m => HashCode.Combine("remote", m.AssemblyName, m.MetadataToken),
                GenericMethod m => HashCode.Combine("generic", m.MetadataToken),
                _ => 0
            };
    }

    public sealed class TypeIdComparer : IEqualityComparer<ITypeId>
    {
        public bool Equals(ITypeId? x, ITypeId? y)
        {
            if (ReferenceEquals(x, y)) return true;
            if (x is null || y is null) return false;

            return (x, y) switch
            {
                (LocalType a, LocalType b) =>
                    a.MetadataToken == b.MetadataToken,

                (RemoteType a, RemoteType b) =>
                    a.AssemblyName == b.AssemblyName &&
                    a.MetadataToken == b.MetadataToken,

                (GenericParameter a, GenericParameter b) =>
                    a.ParameterName == b.ParameterName,

                (SpecificationType a, SpecificationType b) =>
                    Equals(a.MetadataToken, b.MetadataToken),

                (FunctionType a, FunctionType b) =>
                    a.FunctionName == b.FunctionName,

                _ => false
            };
        }

        public int GetHashCode(ITypeId obj)
        {
            return obj switch
            {
                LocalType t =>
                    HashCode.Combine("local", t.MetadataToken),

                RemoteType t =>
                    HashCode.Combine("remote", t.AssemblyName, t.MetadataToken),

                GenericParameter t =>
                    HashCode.Combine("gp", t.ParameterName),

                SpecificationType t =>
                    HashCode.Combine("spec", t.MetadataToken),

                FunctionType t =>
                    HashCode.Combine("fn", t.FunctionName),

                _ => throw new InvalidOperationException($"Unknown ITypeId: {obj.GetType()}")
            };
        }
    }
}
