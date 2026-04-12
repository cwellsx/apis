using Core.Output.Ids;

namespace Core.Id.Types
{
    // token in this assembly
    internal sealed record LocalType(int MetadataToken) : ILocalTypeId;

    // resolved TypeRef -> remote TypeDef
    internal sealed record RemoteType(string AssemblyName, int MetadataToken) : IBaseTypeId;

    // generic parameter -> enclosing method or type (in this assembly)
    internal sealed record GenericParameter(string ParameterName) : IBaseTypeId;

    // saying that IBaseTypeId is the type of Resolved isn't perfect --
    // it correctly allows e.g. "T&" when the TypeSpec is for the type of a method parameter
    // but the BaseType of TypeInfo can also be a TypeSpec but cannot resolve to a GenericParameter
    // even so this is good enough -- this models (more than) the range of possible names, and any additional strictness is enforcd only by the compiler depending on the context of the TypeSpec.
    internal sealed record SpecificationType(IBaseTypeId Resolved, ITypeId[]? GenericTypeArguments, string? Suffix) : ITypeId;

    internal sealed record FunctionType(string FunctionName) : ITypeId;
}
