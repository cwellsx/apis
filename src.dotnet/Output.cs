using System;
using System.Linq;

namespace Core
{
    // the Type instances extracted via reflection become invalid when the MetadataLoadContext is destroyed
    // therefore Type properties must be extracted into plain-old-data classes like these, before then.

    // this enum is duplicated in the TypeScript, so edit it there too if you change it here
    public enum Access
    {
        Public = 1,
        Protected = 2,
        Internal = 3,
        Private = 4,
    }

    [Flags]
    public enum Flag
    {
        None = 0,
        Generic = 1,
        GenericDefinition = 2,
        Nested = 4
    }

    public record AssemblyInfo(
        string[] ReferencedAssemblies,
        TypeInfo[] Types
        );

    public record TypeId(
        string? AssemblyName,
        string? Namespace,
        string Name,
        TypeId[]? GenericTypeArguments,
        TypeId? DeclaringType
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
        bool? IsStatic
        );

    public record EventMember(
        string Name,
        string[]? Attributes,
        Access? Access,
        TypeId? EventHandlerType
        );

    public record PropertyMember(
        string Name,
        string[]? Attributes,
        Access? SetAccess,
        Access? GetAccess,
        Parameter[]? Parameters,
        TypeId PropertyType
        );

    public record Parameter(
        string? Name,
        TypeId Type
        );

    public record ConstructorMember(
        string[]? Attributes,
        Access Access,
        Parameter[]? Parameters,
        bool? IsStatic
        );

    public record MethodMember(
        string Name,
        string[]? Attributes,
        Access Access,
        Parameter[]? Parameters,
        bool? IsStatic,
        TypeId[]? GenericArguments,
        TypeId ReturnType
        );

    public record Members(
        FieldMember[]? FieldMembers,
        EventMember[]? EventMembers,
        PropertyMember[]? PropertyMembers,
        TypeId[]? TypeMembers,
        ConstructorMember[]? ConstructorMembers,
        MethodMember[]? MethodMembers
        );
}
