using Core.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.Output.Public
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

    [Flags]
    public enum Flag
    {
        None = 0,
        Generic = 1,
        GenericDefinition = 2,
        Nested = 4
    }

    public enum TypeKind
    {
        None,
        GenericParameter,
        Array,
        Pointer,
        ByReference
    }

    public record AssemblyInfo(
        string[] ReferencedAssemblies,
        TypeInfo[] Types
        );

    public record TypeId(
        string AssemblyName,
        string? Namespace,
        string Name,
        Values<TypeId>? GenericTypeArguments,
        TypeId? DeclaringType,
        TypeKind? Kind,
        TypeId? ElementType,
        int MetadataToken
        );

    public record TypeInfo(
        TypeId TypeId, // not null unless there's an exception
        string[]? Attributes,
        TypeId? BaseType,
        TypeId[]? Interfaces,
        TypeId[]? GenericTypeParameters, // this is a member of System.Reflection.TypeInfo rather than Type
        Access Access,
        Flag? Flag,
        Members Members
        );

    public record FieldMember(
        string Name,
        string[]? Attributes,
        Access Access,
        TypeId FieldType,
        bool? IsStatic,
        int MetadataToken
        );

    // can't be static
    // EventHandlerType is nullable but probably shouldn't be?
    public record EventMember(
        string Name,
        string[]? Attributes,
        Access Access,
        TypeId? EventHandlerType,
        bool? IsStatic,
        int MetadataToken
        );

    // two Access values but these can/should be combined
    public record PropertyMember(
        string Name,
        string[]? Attributes,
        Access Access,
        Parameter[]? Parameters,
        TypeId PropertyType,
        bool? IsStatic,
        int MetadataToken
        );

    public record Parameter(
        string? Name,
        TypeId Type
        );

    public record MethodMember(
        string Name,
        Access Access,
        Values<Parameter>? Parameters,
        bool? IsStatic,
        bool? IsConstructor,
        Values<TypeId>? GenericArguments,
        TypeId ReturnType,
        Values<string>? Attributes,
        int MetadataToken
        );

    public record Members(
        FieldMember[]? FieldMembers,
        EventMember[]? EventMembers,
        PropertyMember[]? PropertyMembers,
        TypeId[]? TypeMembers,
        MethodMember[]? MethodMembers
        );

    public record TypeDetails(string AssemblyName, string TypeName, bool IsCompiler, int? MetadataToken);

    // a shorter version of CallDetails
    public record MethodCall(string AssemblyName, int? MetadataToken);

    // a shorter version of TypeDetails
    public record LocalsType(string AssemblyName, int? MetadataToken);

    // a shorter version of MethodDetails
    public record MethodInfo(string AsText, MethodCall[]? Called, MethodCall[]? Argued, LocalsType[]? Locals);

    public record All(Dictionary<string, AssemblyInfo> Assemblies, List<string> Exceptions, string Version, string[] Exes, Dictionary<string, Dictionary<int, MethodInfo>> AssemblyMethods);
}
