using Core.Extensions;
using System;
using System.Collections.Generic;

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

    public sealed record TypeId(
        string AssemblyName,
        string? Namespace,
        string Name,
        Values<TypeId> GenericTypeArguments,
        TypeId? DeclaringType,
        TypeKind? Kind,
        TypeId? ElementType,
        int MetadataToken
        )
    {
        public string? Namespace { get; set; } = Namespace;
        public bool Equals(TypeId? rhs)
        {
            if (rhs == null)
            {
                return false;
            }

            if (!string.IsNullOrEmpty(this.Namespace) &&
                !string.IsNullOrEmpty(rhs.Namespace) &&
                this.Namespace != rhs.Namespace)
            {
                return false;
            }

            if (this.MetadataToken != 0 &&
                rhs.MetadataToken != 0 &&
                rhs.MetadataToken != this.MetadataToken)
            {
                return false;
            }

            return this.AssemblyName == rhs.AssemblyName &&
                    this.Name == rhs.Name &&
                    this.GenericTypeArguments == rhs.GenericTypeArguments &&
                    this.DeclaringType == rhs.DeclaringType &&
                    this.Kind == rhs.Kind &&
                    this.ElementType == rhs.ElementType
                    ;
        }
        public override int GetHashCode() => Name.GetHashCode();
  }

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
        )
    {
        internal string[]? Attributes { get; set; } = Attributes;
    }

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
        Values<Parameter> Parameters,
        TypeId PropertyType,
        bool? IsStatic,
        int MetadataToken
        )
    {
        internal string[]? Attributes { get; set; } = Attributes;
    }

    public record Parameter(
        string? Name,
        TypeId Type
        );

    public record MethodMember(
        string Name,
        Access Access,
        Values<Parameter> Parameters,
        bool? IsStatic,
        bool? IsConstructor,
        Values<TypeId> GenericArguments,
        TypeId ReturnType,
        Values<string> Attributes,
        int MetadataToken
        )
    {
        internal Values<string>? Attributes { get; set; } = Attributes;
        internal bool? IsConstructor { get; set; } = IsConstructor;
    }

    public record Members(
        FieldMember[]? FieldMembers,
        EventMember[]? EventMembers,
        PropertyMember[]? PropertyMembers,
        TypeId[]? TypeMembers,
        MethodMember[]? MethodMembers
        );

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
