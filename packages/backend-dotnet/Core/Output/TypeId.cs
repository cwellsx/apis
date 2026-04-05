using Core.Serializer;
using System.Collections.Generic;
using System.Linq;

namespace Core.Output
{
    // abstract superclass
    public abstract record TypeId : IShortJson
    {
        protected string FullName { get; }

        protected TypeId(string fullName)
        {
            FullName = fullName;
        }

        // methods of the IShortJson interface used to help serialize these records in a compact format
        public abstract object SerializeAs { get; }
        public string GetName(INameFromId nameFromId)
        {
            var name = HelpGetName(nameFromId);
            if (name != FullName)
            {
                throw new System.Exception();
            }
            return name;
        }

        protected abstract string HelpGetName(INameFromId nameFromId);
    }

    // superclass for SimpleTypeId and GenericParameterId but not TypeSpecId
    public abstract record BaseTypeId : TypeId
    {
        protected BaseTypeId(string fullName) : base(fullName) { }

        internal abstract TypeDefName GetTypeDefName(INameFromId nameFromId);
    }

    public abstract record SimpleTypeId : BaseTypeId
    {
        protected string AssemblyName { get; }

        internal SimpleTypeId(string assemblyName, string fullName)
            : base(fullName)
        {
            AssemblyName = assemblyName;
        }

        protected override string HelpGetName(INameFromId nameFromId)
        {
            if (nameFromId.IsMicrosoftAssemblyName(AssemblyName))
            {
                return FullName;
            }
            // Cecil doesn't show generic parameters, only generic arguments
            return (GetTypeDefName(nameFromId) with { GenericTypeParameters = null }).AsName;
        }
    }

    // token in this assembly
    public sealed record LocalTypeId : SimpleTypeId
    {
        internal int MetadataToken { get; }

        internal LocalTypeId(string localAssemblyName, int metadataToken, string fullName)
            : base(localAssemblyName, fullName)
        {
            MetadataToken = metadataToken;
        }

        public override object SerializeAs => MetadataToken;
        internal override TypeDefName GetTypeDefName(INameFromId nameFromId) => nameFromId.GetTypeDefName(AssemblyName, MetadataToken);
    }

    // resolved TypeRef -> remote TypeDef
    public sealed record RemoteTypeId : SimpleTypeId
    {
        private readonly int _metadataToken;

        internal RemoteTypeId(string assemblyName, int metadataToken, string fullName)
            : base(assemblyName, fullName)
        {
            _metadataToken = metadataToken;
        }

        public override object SerializeAs => $"{AssemblyName}|{_metadataToken}";
        internal override TypeDefName GetTypeDefName(INameFromId nameFromId) => nameFromId.GetTypeDefName(AssemblyName, _metadataToken);
    }

    // generic parameter -> enclosing method or type (in this assembly)
    public sealed record GenericParameterTypeId(string OwnerAssembly, int OwnerToken, bool OwnerIsMethod, int Position, string Name) : BaseTypeId(Name)
    {
        public override object SerializeAs => Name;
        protected override string HelpGetName(INameFromId nameFromId) => Name;
        internal override TypeDefName GetTypeDefName(INameFromId nameFromId) => new TypeDefName(Name, null);
    }

    public sealed record SpecTypeId(BaseTypeId Resolved, TypeId[]? GenericTypeArguments, string Suffix, string FullName) : TypeId(FullName)
    {
        public override object SerializeAs
        {
            get
            {
                var result = new List<object>();
                result.Add(Resolved.SerializeAs);
                if (GenericTypeArguments != null)
                {
                    result.AddRange(GenericTypeArguments.Select(arg => arg.SerializeAs));
                }
                result.Add(FullName);
                return result.ToArray();
            }
        }
        protected override string HelpGetName(INameFromId nameFromId)
        {
            var typeDefName = Resolved.GetTypeDefName(nameFromId);
            if (typeDefName.GenericTypeParameters == null)
            {
                if (GenericTypeArguments != null)
                {
                    throw new System.Exception();
                }
            }
            else
            {
                if (GenericTypeArguments == null)
                {
                    throw new System.Exception();
                }
                if (typeDefName.GenericTypeParameters.Length != GenericTypeArguments.Length)
                {
                    throw new System.Exception();
                }
                typeDefName = new TypeDefName(typeDefName.TypeName, GenericTypeArguments.Select(typeId => typeId.GetName(nameFromId)).ToArray());
            }
            return typeDefName.AsName + Suffix;
        }
    }
}
