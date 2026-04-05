namespace Core.Output
{
    public interface IShortJson
    {
        object SerializeAs { get; }
        string GetName(INameFromId nameFromId);
    }
}
