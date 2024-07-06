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

    public record MemberException(
        string Name,
        int MetadataToken,
        string Exception
        );

    public record Members(
        FieldMember[]? FieldMembers,
        EventMember[]? EventMembers,
        PropertyMember[]? PropertyMembers,
        TypeId[]? TypeMembers,
        MethodMember[]? MethodMembers,
        MemberException[]? Exceptions
        );

    public record Error(
        // this is the error message
        string ErrorMessage,
        // these are from the MethodId call
        Internal.TypeIdEx WantType,
        Internal.MethodMemberEx WantMethod,
        Internal.TypeIdEx[]? GenericTypeArguments,
        Internal.TypeIdEx[]? GenericMethodArguments,
        // these are the candidates found
        Internal.MethodMemberEx[]? FoundMethods,
        // these are their generic transformation
        Internal.MethodMemberEx[]? TransformedMethods
        )
    {
        internal Error(string errorMessage, Internal.MethodId call) : this(errorMessage, call, null) { }
        internal Error(string errorMessage, Internal.MethodId call, Internal.MethodMemberEx[]? foundMethods) : this(errorMessage, call, foundMethods, null) { }
        internal Error(string errorMessage, Internal.MethodId call, Internal.MethodMemberEx[]? foundMethods, Internal.MethodMemberEx[]? transformedMethods) : this(
            errorMessage,
            call.DeclaringType,
            call.MethodMember,
            call.GenericTypeArguments?.Array,
            call.GenericMethodArguments?.Array,
            foundMethods,
            transformedMethods
            )
        { }
    }

    public record CallDetails(
        // these are TMI but we get them from the decompiler
        string MethodMember,
        string DeclaringType,
        string AssemblyName,
        // this is determined by MethodFinder, or not if there's an error
        int? MetadataToken,
        Error? Error
        )
    {
        internal CallDetails(Internal.TypeIdEx declaringType, Internal.Decompiled decompiled) : this(
            decompiled.MethodMember.AsString(decompiled.GenericArguments, false),
            declaringType.AsString(false),
            declaringType.AssemblyName.NotNull(),
            decompiled.MetadataToken,
            null
            )
        { }

        internal CallDetails(Internal.MethodId call, int? metadataToken, Error? error) : this(
            call.MethodMember.AsString(call.GenericMethodArguments, false),
            call.DeclaringType.AsString(false),
            call.DeclaringType.AssemblyName.NotNull(),
            metadataToken,
            error
            )
        { }
    }

    public record MethodDetails(
        string AsText,
        string MethodMember,
        string DeclaringType,
        List<CallDetails> Called,
        List<CallDetails> CalledBy,
        List<CallDetails> Argued,
        List<CallDetails> ArguedBy,
        string? Exception
        )
    {
        internal MethodDetails(string asText, string methodMember, string declaringType) : this(asText, methodMember, declaringType,
            new List<CallDetails>(), new List<CallDetails>(), new List<CallDetails>(), new List<CallDetails>(),
            null) { }
        internal MethodDetails(string methodMember, string declaringType, Exception exception) : this(string.Empty, methodMember, declaringType,
            new List<CallDetails>(), new List<CallDetails>(), new List<CallDetails>(), new List<CallDetails>(),
            exception.ToString()) { }
    }

    // a shorter version of CallDetails
    public record MethodCall(string AssemblyName, int? MetadataToken, Error? Error)
    {
        internal MethodCall(CallDetails callDetails) : this(callDetails.AssemblyName, callDetails.MetadataToken, callDetails.Error) { }
    }

    // a shorter version of MethodDetails
    public record MethodInfo(string AsText, MethodCall[]? Called, MethodCall[]? Argued, string? Exception)
    {
        internal MethodInfo(MethodDetails methodDetails) : this(
            methodDetails.AsText,
            From(methodDetails.Called),
            From(methodDetails.Argued),
            methodDetails.Exception)
        { }
        private static MethodCall[]? From(List<CallDetails> list) => list.Count == 0 ? null : list.Select(from => new MethodCall(from)).ToArray();
    }

    public record All(Dictionary<string, AssemblyInfo> Assemblies, List<string> Exceptions, string Version, string[] Exes, Dictionary<string, Dictionary<int, MethodInfo>> AssemblyMethods);
}
