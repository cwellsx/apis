using System.Runtime.Versioning;

namespace Core.Loader
{
    internal interface IReader<T>
    {
        FrameworkName GetTargetFramework(string assemblyPath);
        T ReadAssemblyFromPath(string fileName);
        AssemblyReference[] GetAssemblyReferences(T assemblyData);
    }
}
