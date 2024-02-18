using System;
using System.Linq;

namespace Core
{
    // the Type instances extracted via reflection become invalid when the MetadataLoadContext is destroyed
    // therefore Type properties must be extracted into plain-old-data classes like these, before then.

    // this enum is duplicated in the TypeScript, so edit it there too if you change it here
    public enum Flags
    {
        Public = 1,
        Protected = 2,
        Internal = 3,
        Private = 4,

        Nested = 5,

        Generic = 6,
        GenericDefinition = 7
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
        //bool? IsUnwanted,
        Flags[]? Flags,

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
        internal bool HasFlag(Flags flag) => Flags?.Contains(flag) ?? false;
    }
}
