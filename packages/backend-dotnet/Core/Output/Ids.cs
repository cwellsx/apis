namespace Core.Output.Ids
{
    public interface ITypeId;
    public interface IBaseTypeId : ITypeId; // superclass for LocalType, RemoteType, and GenericParameter -- but not SpecificationType nor FunctionType
    public interface ILocalTypeId : IBaseTypeId
    {
        int MetadataToken { get; }
    }

    public interface IId
    {
        string FullName { get; }
        object LeafObject { get; }
    }

    public record Id<T>(string FullName, T LeafId) : IId where T : notnull
    {
        public object LeafObject => LeafId;
    }

    public record TypeId<T>(string FullName, T LeafId) : Id<T>(FullName, LeafId) where T : ITypeId;
    public record TypeId(string FullName, ITypeId LeafId) : Id<ITypeId>(FullName, LeafId);
    public record LocalTypeId(string FullName, ILocalTypeId LeafId) : Id<ILocalTypeId>(FullName, LeafId);

    //public record MethodId(string FullName, ITypeId LeafId) : Id<ITypeId>(FullName, LeafId);
}
