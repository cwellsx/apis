namespace Core.Extensions
{
    public interface INameFromId
    {
        string GetTypeName(string assemblyName, int metadataToken);
    }
}
