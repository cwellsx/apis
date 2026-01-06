using Core.Loader;
using ICSharpCode.Decompiler.Metadata;
using System.Threading.Tasks;

namespace Core.Decompiler
{
    internal sealed class AssemblyResolver : IAssemblyResolver, ILoader<PEFile>
    {
        ILoaded<PEFile> _loadedAssemblies;

        public AssemblyResolver(ILoaded<PEFile> loadedAssemblies)
        {
            _loadedAssemblies = loadedAssemblies;
        }

        public PEFile ReadAssemblyFromPath(string fileName, byte[] bytes)
        {
            using var stream = new System.IO.MemoryStream(bytes, writable: false);
            return new PEFile(fileName, stream, System.Reflection.PortableExecutable.PEStreamOptions.PrefetchEntireImage);
        }

        internal PEFile? Resolve(Loader.AssemblyReference assemblyReference)
        {
            _loadedAssemblies.TryGetAssembly(assemblyReference, this, out var peFile);
            return peFile;
        }

        public PEFile? Resolve(IAssemblyReference reference)
        {
            var assemblyReference = new Loader.AssemblyReference(reference);
            _loadedAssemblies.TryGetAssembly(assemblyReference, this, out var peFile);
            if (peFile == null)
            {
                throw new ResolutionException(reference, null, null);
            }
            return peFile;
        }

        public Task<PEFile?> ResolveAsync(IAssemblyReference reference)
        {
            // ILSpy's own default resolver does exactly this:
            // wrap the sync call in a completed Task.
            return Task.FromResult(Resolve(reference));
        }

        public PEFile? ResolveModule(PEFile mainModule, string moduleName)
        {
            throw new System.Exception("Not implemented");
        }

        public Task<PEFile?> ResolveModuleAsync(PEFile mainModule, string moduleName)
        {
            return Task.FromResult(ResolveModule(mainModule, moduleName));
        }
    }
}