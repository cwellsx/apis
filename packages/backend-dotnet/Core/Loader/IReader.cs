using System.Runtime.Versioning;

namespace Core.Loader
{
    internal interface IReader<T>
    {
        FrameworkName GetTargetFramework(string assemblyPath);
        AssemblyReference[] GetAssemblyReferences(T assemblyData);
    }
}
