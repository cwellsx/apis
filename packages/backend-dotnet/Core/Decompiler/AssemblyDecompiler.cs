using ICSharpCode.Decompiler;
using ICSharpCode.Decompiler.CSharp;
using System;
using System.Reflection.Metadata;
using System.Reflection.Metadata.Ecma335;

namespace Core.Decompiler
{
    internal class AssemblyDecompiler
    {
        CSharpDecompiler _decompiler;

        internal AssemblyDecompiler(string assemblyName, AssemblyResolver assemblyResolver)
        {
            var peFile = assemblyResolver.Resolve(new Loader.AssemblyReference(assemblyName, null));

            if (peFile == null)
            {
                throw new Exception($"Failed to resolve assembly {assemblyName} for decompilation");
            }

            var settings = new DecompilerSettings()
            {
                ThrowOnAssemblyResolveErrors = true
            };
            _decompiler = new CSharpDecompiler(peFile, assemblyResolver, settings);
        }
        
        internal string DecompileMethod(int metadataToken)
        {
            EntityHandle handle = MetadataTokens.EntityHandle(metadataToken);

            // This is the key call:
            return _decompiler.DecompileAsString(handle);
        }
    }
}
