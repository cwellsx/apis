using System;

namespace Core.Loader
{
    internal record AssemblyReference(string Name, Version Version)
    {
        internal AssemblyReference(Mono.Cecil.AssemblyNameReference value) : this(value.Name, value.Version) { }
        internal AssemblyReference(ICSharpCode.Decompiler.Metadata.IAssemblyReference value) : this(value.Name, value.Version ?? new Version()) { }
    }
}
