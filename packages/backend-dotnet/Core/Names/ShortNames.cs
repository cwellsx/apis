namespace Core.Names
{
    internal interface IShortName
    {
    }

    // superclass for SimpleShortName and GenericParameterId but not TypeSpecId
    internal interface IBaseShortName : IShortName;

    // token in this assembly
    internal sealed record LocalShortName(int MetadataToken) : IBaseShortName;

    // resolved TypeRef -> remote TypeDef
    internal sealed record RemoteShortName(string AssemblyName, int MetadataToken) : IBaseShortName;

    // generic parameter -> enclosing method or type (in this assembly)
    internal sealed record GenericParameterShortName(string ParameterName) : IBaseShortName;

    // saying that IBaseShortName is the type of Resolved isn't perfect --
    // it correctly allows e.g. "T&" when the TypeSpec is for the type of a method parameter
    // but the BaseType of TypeInfo can also be a TypeSpec but cannot resolve to a GenericParameter
    // even so this is good enough -- this models (more than) the range of possible names, and any additional strictness is enforcd only by the compiler depending on the context of the TypeSpec.
    internal sealed record SpecificationShortName(IBaseShortName Resolved, IShortName[]? GenericTypeArguments, string? Suffix) : IShortName;

    internal sealed record FunctionShortName(string FunctionName) : IShortName;
}
