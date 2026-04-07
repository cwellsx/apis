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
            try
            {
                var name = HelpGetName(nameFromId);
                if (name != FullName)
                {
                    throw new System.Exception($"name: {name}");
                }
                return name;

            }
            catch (System.Exception ex)
            {
                //return $"FullName: {FullName}, {ex.Message}";
                throw new System.Exception($"FullName: {FullName}", ex);
            }
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
            // Cecil doesn't show generic parameters, only generic arguments
            return GetTypeNameParts(nameFromId).AsName(false);
        }

        internal override TypeNameParts GetTypeNameParts(INameFromId nameFromId)
        {
            return nameFromId.GetTypeNameParts(AssemblyName, MetadataToken);
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

        public override object SerializeAs => Name;
        protected override string HelpGetName(INameFromId nameFromId) => Name;
        internal override TypeNameParts GetTypeNameParts(INameFromId nameFromId) => new TypeNameParts(Name, null);
    }

    internal sealed class SpecTypeId(BaseTypeId Resolved, TypeId[]? GenericTypeArguments, string Suffix, string FullName) : TypeId(FullName)
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
            return typeDefName.AsName(true) + Suffix;
        }
    }

    internal sealed class  FuncTypeId : BaseTypeId
    {
        internal FuncTypeId(string fullName)
            : base(fullName)
        {
        }

        public override object SerializeAs => FullName;

        protected override string HelpGetName(INameFromId nameFromId)
        {
            return FullName;
        }

        internal override TypeNameParts GetTypeNameParts(INameFromId nameFromId)
        {
            return new TypeNameParts(FullName, null);
        }
    }
}
