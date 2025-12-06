using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Versioning;

using Mono.Cecil;

using static Core.AssemblyResolverPaths;

namespace Core.Cecil
{
    // purpose of this class is to implement a resolver
    // and ensure that that each assembly is only loaded once
    internal class AssemblyResolver : IAssemblyResolver
    {
        private readonly string _exePath;

        internal record Found(AssemblyDefinition AssemblyDefinition, bool IsMicrosoft, string Path);
        private readonly IReadOnlyDictionary<string, Found?> _cache;

        internal static string FindSingleExe(string directory)
        {
            var exePaths = GetExesFromDirectory(directory)
                .Where(path => IsExeManagedAssembly(path))
                .ToArray();
            if (exePaths.Length != 1)
            {
                throw new ArgumentException($"Expect to find one managed EXE in directory, actually found {exePaths.Length}");
            }
            return exePaths[0];
        }

        // call this before construction to avoid throwing on native executables
        internal static bool IsExeManagedAssembly(string exePath) =>
            IsManagedAssembly(exePath) ||
            IsManagedAssembly(Path.ChangeExtension(exePath, "dll"));

        internal AssemblyResolver(string exePath)
        {
            _exePath = exePath;

            // the EXE assembly path
            var assemblyPath = IsManagedAssembly(_exePath) ? _exePath : Path.ChangeExtension(exePath, "dll");
            if (!IsExeManagedAssembly(assemblyPath))
            {
                throw new Exception($"EXE is not a managed assembly");
            }

            var frameworkName = GetTargetFramework(assemblyPath);

            // the result of this is one or two paths
            // 1. the directory which contains the exe (i.e. the "app directory")
            // 2. the shared .NET directory (i.e. a subdirectory of C:\Program Files\dotnet\shared or C:\Windows\Microsoft.NET\Framework)
            var appDirectory = GetDirectoryName(assemblyPath);
            var microsoftDirectory = GetMicrosoftDirectory(assemblyPath, frameworkName);

            // if we don't pass this in ReaderParameters then Mono.Cecil will substitute in its own DefaultAssemblyResolver
            // which we don't want e.g. because it uses SearchTrustedPlatformAssemblies
            // however assert that this.Resolve won't be called until after LoadAllAssemblies returns
            var readerParameters = new ReaderParameters { AssemblyResolver = this };
            Func<string, AssemblyDefinition> readAssemblyFromPath = (string fileName) => AssemblyDefinition.ReadAssembly(fileName, readerParameters);

            _cache = LoadAllAssemblies(assemblyPath, readAssemblyFromPath, appDirectory, microsoftDirectory);
        }

        internal IReadOnlyDictionary<string, Found?> Dictionary => _cache;

        internal string ExeFileName => Path.GetFileNameWithoutExtension(_exePath);

        public AssemblyDefinition Resolve(AssemblyNameReference name)
        {
            if (_cache == null)
            {
                throw new Exception("Unexpectted Resolve while initializing");
            }
            _cache.TryGetValue(name.Name, out var found);
            if (found == null)
            {
                throw new AssemblyResolutionException(name);
            }
            return found.AssemblyDefinition;
        }

        public AssemblyDefinition Resolve(AssemblyNameReference name, ReaderParameters parameters)
        {
            throw new NotImplementedException();
        }

        public void Dispose() { }

        private static FrameworkName GetTargetFramework(string assemblyPath)
        {
            // this uses AssemblyDefinition.ReadAssembly because it's complicated to read custom attribute constructor values using PEReader alone.
            // this is the only redundent call to AssemblyDefinition.ReadAssembly i.e. it's called once only for ever other assembly
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

        private static IReadOnlyDictionary<string, Found?> LoadAllAssemblies(
            string assemblyPath,
            Func<string, AssemblyDefinition> readAssemblyFromPath,
            string appDirectory,
            string? microsoftDirectory
            )
        {
            var results = new Dictionary<string, Found?>();
            var stack = new Stack<AssemblyDefinition>();

            void LoadFromPath(string path, bool isMicrosoft)
            {
                var assemblyDefinition = readAssemblyFromPath(path);
                results.Add(Path.GetFileNameWithoutExtension(path), new Found(assemblyDefinition, isMicrosoft, path));
                stack.Push(assemblyDefinition);
            }

            bool LoadFromDirectory(string name, string? directory, bool isMicrosoft)
            {
                if (directory == null)
                {
                    return false;
                }
                var path = Path.Combine(directory, $"{name}.dll");
                if (!File.Exists(path))
                {
                    return false;
                }
                LoadFromPath(path, isMicrosoft);
                return true;
            }

            LoadFromPath(assemblyPath, false);

            while (stack.Count > 0)
            {
                var assemblyDefinition = stack.Pop()!;
                foreach (var assemblyNameReference in assemblyDefinition!.MainModule.AssemblyReferences)
                {
                    var name = assemblyNameReference.Name;
                    if (results.ContainsKey(name))
                    {
                        continue;
                    }
                    if (!LoadFromDirectory(name, appDirectory, false) &&
                        !LoadFromDirectory(name, microsoftDirectory, true))
                    {
                        results.Add(name, null);
                    }
                }
            }

            return results;
        }
    }
}
