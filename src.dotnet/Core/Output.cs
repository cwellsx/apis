using System;
using System.Collections.Generic;
using System.Linq;

namespace Core
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
        string? AssemblyName,
        string? Namespace,
        string Name,
        Values<TypeId>? GenericTypeArguments,
        TypeId? DeclaringType,
        TypeKind? Kind,
        TypeId? ElementType
        )
    {
        public override string ToString() => this.AsString();
    }

    public record TypeInfo(
        TypeId? TypeId, // not null unless there's an exception
        string[]? Attributes,
        TypeId? BaseType,
        TypeId[]? Interfaces,
        TypeId[]? GenericTypeParameters, // this is a member of System.Reflection.TypeInfo rather than Type
        Access? Access,
        Flag? Flag,
        Members? Members,

        string[]? Exceptions
        )
    {
        public string[]? Exceptions { get; set; } = Exceptions;
        internal void AddMessage(string message)
        {
            if (Exceptions == null)
            {
                Exceptions = new[] { message };
            }
            else
            {
                Exceptions = Exceptions.Concat(new[] { message }).ToArray();
            }
        }
    }

    public record FieldMember(
        string Name,
        string[]? Attributes,
        Access Access,
        TypeId FieldType,
        bool? IsStatic
        );

    // can't be static
    // EventHandlerType is nullable but probably shouldn't be?
    public record EventMember(
        string Name,
        string[]? Attributes,
        Access Access,
        TypeId? EventHandlerType,
        bool? IsStatic
        );

    // two Access values but these can/should be combined
    public record PropertyMember(
        string Name,
        string[]? Attributes,
        Access Access,
        Parameter[]? Parameters,
        TypeId PropertyType,
        bool? IsStatic
        );

    public record Parameter(
        string? Name,
        TypeId Type
        );

    // no name, no Type, additional parameters
    public record ConstructorMember(
        string[]? Attributes,
        Access Access,
        Parameter[]? Parameters,
        bool? IsStatic
        );

    public record MethodMember(
        string Name,
        Values<string>? Attributes,
        Access Access,
        Values<Parameter>? Parameters,
        bool? IsStatic,
        bool? IsConstructor,
        Values<TypeId>? GenericArguments,
        TypeId ReturnType
        )
    {
        public override string ToString() => this.AsString();
    }

    public record Members(
        FieldMember[]? FieldMembers,
        EventMember[]? EventMembers,
        PropertyMember[]? PropertyMembers,
        TypeId[]? TypeMembers,
        ConstructorMember[]? ConstructorMembers,
        MethodMember[]? MethodMembers
        );

    public record MethodId(
        MethodMember methodMember,
        TypeId declaringType
        );

    public class MethodDetails
    {
        public string AsText { get; }
        public MethodId[] Calls { get; }
        public List<MethodId> CalledBy { get; } = new List<MethodId>();

        internal MethodDetails(string asText, MethodId[] calls)
        {
            AsText = asText;
            Calls = calls;
        }
    }

    public class Error
    {
        public string Message { get; }
        public object[] Objects { get; }
        public string[] Strings { get; }

        internal Error(string message, object extra, object[] more)
        {
            var objects = new List<object>() { extra };
            objects.AddRange(more);
            Message = $"{message}: {extra}";
            Objects = objects.ToArray();
            Strings = objects.Select(o => o.ToString()).ToArray()!;
        }
    }
}
