using Core.Extensions;
using System.Collections.Generic;
using System.Linq;

namespace Core.Output
{
    // the Type instances extracted via reflection become invalid when the MetadataLoadContext is destroyed
    // therefore Type properties must be extracted into plain-old-data classes like these, before then.

    // this enum is duplicated in the TypeScript, so edit it there too if you change it here
    // these are in sequence from least to most restrictive
    public enum Access
    {
        None,
        Public = 1,
        ProtectedInternal = 2, // protected or internal
        Protected = 3,
        Internal = 4,
        PrivateProtected = 5, // protected and internal
        Private = 6,
    }

    //[Flags]
    //public enum Flag
    //{
    //    None = 0,
    //    Generic = 1,
    //    GenericDefinition = 2,
    //    Nested = 4
    //}

    //public enum TypeKind
    //{
    //    None,
    //    GenericParameter,
    //    Array,
    //    Pointer,
    //    ByReference
    //}

    //public record AssemblyInfo(
    //    string[] ReferencedAssemblies,
    //    TypeInfo[] Types
    //    );

    public record AssemblyInfo(string[] ReferencedAssemblies, TypeDefInfo[] TypeDefinitions);

    // Ids (identities)
    public abstract record TypeId : IShortJson
    {
        public abstract object SerializeAs { get; }
    }

    public abstract record SimpleTypeId : TypeId;

    // token in this assembly
    public sealed record LocalTypeDefId(int MetadataToken) : SimpleTypeId
    {
        public override object SerializeAs => MetadataToken;
    }
    // resolved TypeRef -> remote TypeDef
    public sealed record RemoteTypeDefId(string AssemblyName, int MetadataToken) : SimpleTypeId
    {
        public override object SerializeAs => $"{AssemblyName}|{MetadataToken}";
    }
    public sealed record GenericParameterId(string OwnerAssembly, int OwnerToken, bool OwnerIsMethod, int Position, string Name) : SimpleTypeId
    {
        public override object SerializeAs => Name;
    }

    public sealed record TypeSpecId(SimpleTypeId Resolved, SimpleTypeId[]? GenericTypeArguments, string FullName) : TypeId
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
    }

    /// <summary>
    /// All properties which were previously in TypeId plus TypeInfo
    /// excluding (GenericTypeArguments, Kind, ElementType, Flag) which are TypeSpec only and not TypeDef
    /// </summary>
    public record TypeDefInfo(
        // string AssemblyName,
        LocalTypeDefId Id,
        string? Namespace,
        string Name,
        LocalTypeDefId? DeclaringType,
        string[]? Attributes,
        TypeId? BaseType,
        TypeId[]? Interfaces,
        string[]? GenericTypeParameters,
        Access Access,
        // Members
        FieldMember[]? FieldMembers,
        EventMember[]? EventMembers,
        PropertyMember[]? PropertyMembers,
        TypeId[]? TypeMembers,
        MethodMember[]? MethodMembers
     );

    // Members
    public record FieldMember(string Name, TypeId FieldType, Access Access, bool? IsStatic, string[]? Attributes, int MetadataToken);
    public record EventMember(string Name, TypeId EventHandlerType, Access Access, bool? IsStatic, string[]? Attributes, int MetadataToken);
    public record PropertyMember(string Name, TypeId PropertyType, Access Access, bool? IsStatic, Parameter[]? Parameters, string[]? Attributes, int MetadataToken);
    public record Parameter(string? Name, TypeId Type);
    public record MethodMember(string Name, Access Access, bool? IsStatic, bool? IsConstructor, string[]? GenericParameters, Parameter[]? Parameters, TypeId ReturnType, string[]? Attributes, int MetadataToken);


    // a shorter version of CallDetails
    public record MethodCall(string AssemblyName, int? MetadataToken);

    // a shorter version of TypeDetails
    public record LocalsType(string AssemblyName, int? MetadataToken);

    // a shorter version of MethodDetails
    public record MethodInfo(string AsText, MethodCall[]? Called, MethodCall[]? Argued, LocalsType[]? Locals);

    public record All(
        Dictionary<string, AssemblyInfo> Assemblies,
        List<string> Exceptions,
        string Version,
        string[] Exes,
        Dictionary<string, Dictionary<int, MethodInfo>> AssemblyMethods,
        Dictionary<string, Dictionary<int, int>> CompilerMethods
        );
}
