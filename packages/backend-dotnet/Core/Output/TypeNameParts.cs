namespace Core.Output
{
    public record TypeNameParts(string TypeName, string[]? GenericTypeParameters)
    {
        internal string AsName => GenericTypeParameters == null
            ? TypeName
            : $"{TypeName}`{GenericTypeParameters.Length}<{string.Join(", ", GenericTypeParameters)}>";
    }
}
