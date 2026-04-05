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
    public abstract class BaseTypeId : TypeId
    {
        protected BaseTypeId(string fullName) : base(fullName) { }

        internal abstract TypeNameParts GetTypeNameParts(INameFromId nameFromId);
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

        protected override string HelpGetName(INameFromId nameFromId)
        {
            if (nameFromId.IsMicrosoftAssemblyName(AssemblyName))
            {
                return FullName;
            }
            // Cecil doesn't show generic parameters, only generic arguments
            return (GetTypeNameParts(nameFromId) with { GenericTypeParameters = null }).AsName;
        }

        internal override TypeNameParts GetTypeNameParts(INameFromId nameFromId) => nameFromId.GetTypeNameParts(AssemblyName, MetadataToken);
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
        readonly string _name;

        internal GenericParameterTypeId(string ownerAssembly, int ownerToken, bool ownerIsMethod, int position, string name)
            : base(name)
        {
            _name = name;
        }

        public override object SerializeAs => _name;
        protected override string HelpGetName(INameFromId nameFromId) => _name;
        internal override TypeNameParts GetTypeNameParts(INameFromId nameFromId) => new TypeNameParts(_name, null);
    }

    internal sealed class SpecTypeId(BaseTypeId Resolved, TypeId[]? GenericTypeArguments, string Suffix, string FullName) : TypeId(FullName)
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
            var typeDefName = Resolved.GetTypeNameParts(nameFromId);
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
                typeDefName = new TypeNameParts(typeDefName.TypeName, GenericTypeArguments.Select(typeId => typeId.GetName(nameFromId)).ToArray());
            }
            return typeDefName.AsName + Suffix;
        }
    }
}
