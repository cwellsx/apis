using Core.Names;
using System.Collections.Generic;
using System.Linq;

namespace Core.Output
{
    // abstract superclass
    public abstract class TypeId : IShortJson
    {
        protected string FullName { get; }

        protected TypeId(string fullName)
        {
            FullName = fullName;
        }

        // methods of the IShortJson interface used to help serialize these classes in a compact format
        public abstract object SerializeAs { get; }
    }

    // superclass for SimpleTypeId and GenericParameterId but not TypeSpecId
    public abstract class BaseTypeId : TypeId
    {
        protected BaseTypeId(string fullName) : base(fullName) { }
    }

    public abstract class SimpleTypeId : BaseTypeId
    {
        protected string AssemblyName { get; }
        protected int MetadataToken { get; }

        internal SimpleTypeId(string assemblyName, int metadataToken, string fullName)
            : base(fullName)
        {
            AssemblyName = assemblyName;
            MetadataToken = metadataToken;
        }
    }

    // token in this assembly
    public sealed class LocalTypeId : SimpleTypeId
    {
        internal int GetMetadataToken() => MetadataToken;

        internal LocalTypeId(string localAssemblyName, int metadataToken, string fullName)
            : base(localAssemblyName, metadataToken, fullName)
        {
        }

        public override object SerializeAs => MetadataToken;
    }

    // resolved TypeRef -> remote TypeDef
    internal sealed class RemoteTypeId : SimpleTypeId
    {
        internal RemoteTypeId(string assemblyName, int metadataToken, string fullName)
            : base(assemblyName, metadataToken, fullName)
        {
        }

        public override object SerializeAs => $"{AssemblyName}|{MetadataToken}";
    }

    // generic parameter -> enclosing method or type (in this assembly)
    internal sealed class GenericParameterTypeId : BaseTypeId
    {
        internal string Name { get; }

        internal GenericParameterTypeId(string ownerAssembly, int ownerToken, bool ownerIsMethod, int position, string name)
            : base(name)
        {
            Name = name;
        }

        public override object SerializeAs => IsValidIdentifier(Name) ? Name : $"!{Name}";

        private static bool IsValidIdentifier(string s)
        {
            if (string.IsNullOrEmpty(s)) return false;
            if (!(char.IsLetter(s[0]) || s[0] == '_')) return false;

            for (int i = 1; i < s.Length; i++)
                if (!(char.IsLetterOrDigit(s[i]) || s[i] == '_'))
                    return false;

            return true;
        }
    }

    internal sealed class SpecTypeId(BaseTypeId Resolved, TypeId[]? GenericTypeArguments, string? Suffix, string FullName) : TypeId(FullName)
    {
        public override object SerializeAs
        {
            get
            {
                var result = new List<object>();
                result.Add(Resolved);
                if (GenericTypeArguments != null)
                {
                    result.AddRange(GenericTypeArguments);
                }
                if (!string.IsNullOrEmpty(Suffix))
                {
                    result.Add(Suffix);
                }
                if (result.Count < 2)
                {
                    throw new System.Exception();
                }
                return result.ToArray();
            }
        }
    }

    internal sealed class  FuncTypeId : BaseTypeId
    {
        internal FuncTypeId(string fullName)
            : base(fullName)
        {
        }

        public override object SerializeAs => FullName;
    }
}
