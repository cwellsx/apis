using Core.Output;

namespace Core.FullNames
{
    internal interface IFetch
    {
        TypeInfo FetchTypeInfo(string assemblyName, int metadataToken);
        MethodPair FetchMethodPair(string assemblyName, int metadataToken);
    }
}
