namespace Core.Extensions
{
    public record TypeDefName(string TypeName, string[]? GenericTypeParameters)
    {
        internal string AsName => GenericTypeParameters == null
            ? TypeName
            : $"{TypeName}`{GenericTypeParameters.Length}<{string.Join(", ", GenericTypeParameters)}>";
    }

    public interface INameFromId
    {
        TypeDefName GetTypeDefName(string assemblyName, int metadataToken);
        bool IsMicrosoftAssemblyName(string assemblyName);
    }
}
