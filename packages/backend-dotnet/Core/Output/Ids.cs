namespace Core.Output.Ids
{
    /*
     * LeafObject is ITypeId or IMethodId
     * 
     * What's serialized into the JSON is the LeafObject and not the FullName.
     * The FullName is reconstructed from the LeafObject after deserialization.
     * 
     * JsonConverters converts to JSON using Flatten.FromIId
     */

    public interface IId
    {
        string FullName { get; }
        object LeafObject { get; }
    }

    public record Id<T>(string FullName, T LeafId) : IId where T : notnull
    {
        public object LeafObject => LeafId;
    }

    /*
     * Types
     */

    public interface ITypeId;
    public interface IBaseTypeId : ITypeId; // superclass for LocalType, RemoteType, and GenericParameter -- but not SpecificationType nor FunctionType
    public interface ILocalTypeId : IBaseTypeId
    {
        int MetadataToken { get; }
    }

    public record TypeId(string FullName, ITypeId LeafId) : Id<ITypeId>(FullName, LeafId);
    public record LocalTypeId(string FullName, ILocalTypeId LeafId) : Id<ILocalTypeId>(FullName, LeafId);

    /*
     * Methods
     */

    public interface IMethodId;
    public interface IBaseMethodId : IMethodId;
    public interface ILocalMethodId : IBaseMethodId;

    public record MethodId(string FullName, IMethodId LeafId) : Id<IMethodId>(FullName, LeafId);
    public record LocalMethodId(string FullName, ILocalMethodId LeafId) : Id<ILocalMethodId>(FullName, LeafId);
}
