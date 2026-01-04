global using LoadedAssemblies = Core.Loader.LoadedAssemblies<Core.Cecil.AssemblyData>;

using System;
using System.Linq;
using System.Runtime.Versioning;
using Core.Loader;
using Mono.Cecil;

namespace Core.Cecil
{
    // purpose of this class is to implement a resolver
    // it uses LoadedAssemblies as a cache to ensure that that each assembly is only loaded once
    internal sealed class AssemblyResolver : IAssemblyResolver, IReader<AssemblyData>, IDisposable
    {
        internal LoadedAssemblies LoadedAssemblies { get; init; }

        internal AssemblyResolver(string exePath)
        {
            // beware don't call Resolve until after LoadedAssemblies is fully constructed
            // but it's safe to call the IReader methods
            LoadedAssemblies = new LoadedAssemblies(exePath, this);
        }

        #region IAssemblyResolver

        public AssemblyDefinition Resolve(AssemblyNameReference name)
        {
            if (LoadedAssemblies == null)
            {
                throw new Exception("Unexpected Resolve while initializing");
            }
            var assemblyReference = new AssemblyReference(name);
            LoadedAssemblies.TryGetAssembly(assemblyReference, out var assemblyData);
            if (assemblyData == null)
            {
                throw new AssemblyResolutionException(name);
            }
            return assemblyData.AssemblyDefinition;
        }

        public AssemblyDefinition Resolve(AssemblyNameReference name, ReaderParameters parameters)
        {
            throw new NotImplementedException();
        }

        #endregion

        #region IReader<AssemblyData>

        public FrameworkName GetTargetFramework(string assemblyPath)
        {
            // this uses AssemblyDefinition.ReadAssembly because it's complicated to read custom attribute constructor values using PEReader alone.
            // this is the only redundent call to AssemblyDefinition.ReadAssembly i.e. for the EXE -- every other assembly is loaded only once via ReadAssemblyFromPath
            using var assembly = AssemblyDefinition.ReadAssembly(assemblyPath);
            if (assembly == null)
            {
                throw new Exception($"Failed to read assembly from {assemblyPath}");
            }
            var attribute = assembly.CustomAttributes.FirstOrDefault(attr => attr.AttributeType.FullName == "System.Runtime.Versioning.TargetFrameworkAttribute");
            if (attribute != null && attribute.ConstructorArguments.Count > 0)
            {
                var frameworkName = (string)attribute.ConstructorArguments[0].Value!;
                return new FrameworkName(frameworkName);
            }
            throw new ArgumentException($"TargetFrameworkAttribute not found in assembly {assemblyPath}");
        }

        public AssemblyData ReadAssemblyFromPath(string fileName)
        {
            var readerParameters = new ReaderParameters { AssemblyResolver = this };
            var assemblyDefinition = AssemblyDefinition.ReadAssembly(fileName, readerParameters);
            var assemblyData = new AssemblyData(assemblyDefinition);
            return assemblyData;
        }

        public AssemblyReference[] GetAssemblyReferences(AssemblyData assemblyData)
        {
            return assemblyData.AssemblyReferences;
        }

        #endregion

        public void Dispose()
        {
            LoadedAssemblies.Dispose();
        }
    }
}
