namespace Core.Extensions
{
    public interface IShortJson
    {
        object SerializeAs { get; }
        string GetName(INameFromId nameFromId);
    }
}
