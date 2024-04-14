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
        )
    {
        public const string CtorName = ".ctor"; // matches the name returned from Core.IL
    }

    public record Members(
        FieldMember[]? FieldMembers,
        EventMember[]? EventMembers,
        PropertyMember[]? PropertyMembers,
        TypeId[]? TypeMembers,
        MethodMember[]? MethodMembers
        );

    public record Method(
        string MethodMember,
        string DeclaringType,
        string AssemblyName,
        int MetadataToken
        )
    {
        internal Method(MethodId methodId, int metadataToken)
            : this(
                  methodId.MethodMember.AsString(methodId.GenericMethodArguments, false),
                  methodId.declaringType.AsString(false),
                  methodId.declaringType.AssemblyName.NotNull(),
                  metadataToken
                  )
        { }

        internal Method(TypeIdEx declaringType, MethodMemberEx methodMember, Values<TypeId>? genericParameters, int metadataToken)
            : this(
                  methodMember.AsString(genericParameters, false),
                  declaringType.AsString(false),
                  declaringType.AssemblyName.NotNull(),
                  metadataToken
                  )
        { }
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

    public record CallDetails(Method Called, Error? Error, bool? IsWarning)
    {
        private const int IgnoredMetadataToken = 0;

        internal CallDetails(MethodId called, Error error)
            : this(new Method(called, IgnoredMetadataToken), error, null)
        { }

        internal CallDetails(MethodId called, int metadataToken)
            : this(new Method(called, metadataToken), null, null)
        { }

        internal CallDetails(MethodId called, int metadataToken, Error error)
            : this(new Method(called, metadataToken), error, true)
        { }
    }

    public record MethodDetails(string AsText, string MethodMember, string DeclaringType, List<CallDetails> Calls, List<Method> CalledBy)
    {
        internal MethodDetails(string asText, string methodMember, string declaringType) : this(asText, methodMember, declaringType, new List<CallDetails>(), new List<Method>()) { }
    }
}
