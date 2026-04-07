namespace Core.Output
{
    public interface INameFromId
    {
        TypeNameParts GetTypeNameParts(string assemblyName, int metadataToken);
    }
}
