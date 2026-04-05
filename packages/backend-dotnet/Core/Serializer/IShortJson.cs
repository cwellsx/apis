namespace Core.Serializer
{
    public interface IShortJson
    {
        object SerializeAs { get; }
        string GetName(INameFromId nameFromId);
    }
}
