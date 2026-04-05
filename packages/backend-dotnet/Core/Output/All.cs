using System.Collections.Generic;

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

    /// <summary>
    /// All properties which were previously in TypeId plus TypeInfo
    /// excluding (GenericTypeArguments, Kind, ElementType, Flag) which are TypeSpec only and not TypeDef
    /// </summary>
    public record TypeInfo(
        // string AssemblyName,
        LocalTypeId Id,
        string? Namespace,
        string Name,
        LocalTypeId? DeclaringType,
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
    public record Parameter(string Name, TypeId Type);
    public record MethodMember(string Name, Access Access, bool? IsStatic, bool? IsConstructor, string[]? GenericParameters, Parameter[]? Parameters, TypeId ReturnType, string[]? Attributes, int MetadataToken);


    // a shorter version of CallDetails
    public record MethodCall(string AssemblyName, int? MetadataToken);

    // a shorter version of MethodDetails
    public record MethodInfo(string AsText, MethodCall[]? Called, MethodCall[]? Argued, TypeId[]? Locals);

    public record AssemblyInfo(string[] ReferencedAssemblies, TypeInfo[] TypeInfos);

    public record All(
        Dictionary<string, AssemblyInfo> Assemblies,
        List<string> Exceptions,
        string Version,
        string[] Exes,
        Dictionary<string, Dictionary<int, MethodInfo>> AssemblyMethods,
        Dictionary<string, Dictionary<int, int>> CompilerMethods,
        string[] MicrosoftAssemblyNames
        );
}
