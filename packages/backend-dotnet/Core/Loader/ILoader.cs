using System.Runtime.Versioning;

namespace Core.Loader
{
    internal interface ILoader<T>
    {
        T ReadAssemblyFromPath(string fileName, byte[] bytes);
    }
}
