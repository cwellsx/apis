// this is a generic collection of assemblies
// - it is a dictionary of Cecil.AssemblyData
// - an ICSharpCode.*.PEFile can be loaded from the same bytes
global using LoadedAssemblies = Core.Loader.LoadedAssemblies<Core.Cecil.AssemblyData, ICSharpCode.Decompiler.Metadata.PEFile>;
