using Core.Output.Ids;

namespace Core.Id.Methods
{
    // token in this assembly
    internal sealed record LocalMethod(int MetadataToken) : ILocalMethodId;

    // resolved TypeRef -> remote TypeDef
    internal sealed record RemoteMethod(string AssemblyName, int MetadataToken) : IBaseMethodId;

    // generic parameter -> enclosing method or type (in this assembly)
    internal sealed record GenericMethod(int MetadataToken) : IMethodId;
}
