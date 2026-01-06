using System;

namespace Core.Loader
{
    internal interface ILoaded<T> where T : IDisposable
    {
        bool TryGetAssembly(AssemblyReference assemblyReference, ILoader<T> loader, out T? peFile);
    }
}
