using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.Versioning;

using static Core.Loader.AssemblyResolverPaths;

namespace Core.Loader
{
    internal class LoadedAssemblies<T>
    {
        private class FilterImpl : IFilter
        {
            private readonly LoadedAssemblies<T> _self;
            internal FilterImpl(LoadedAssemblies<T> self)
            {
                _self = self;
            }

            public bool IsMicrosoftAssemblyName(string assemblyName) =>
                assemblyName == "mscorlib" ||
                assemblyName == "netstandard" ||
                assemblyName.StartsWith("System.") ||
                assemblyName.StartsWith("Microsoft.") ||
                // also don't try to reflect ICSharpCode.Decompiler
                // bcause it throws an "assembly already loaded" on System.Reflection.Metadata
                assemblyName == "ICSharpCode.Decompiler";


            public bool IsMicrosoftAssemblyPath(string assemblyName) => _self._cache[assemblyName]!.IsMicrosoft;
        }

        private readonly string _exePath;

        internal class Found
        {
            internal readonly T AssemblyData;
            internal readonly bool IsMicrosoft;
            internal readonly string Path;

            internal Found(T assemblyData, bool isMicrosoft, string path)
            {
                AssemblyData = assemblyData;
                IsMicrosoft = isMicrosoft;
                Path = path;
            }
        }

        private readonly IReadOnlyDictionary<string, Found?> _cache;

        //internal static string FindSingleExe(string directory)
        //{
        //    var exePaths = GetExesFromDirectory(directory)
        //        .Where(path => IsExeManagedAssembly(path))
        //        .ToArray();
        //    if (exePaths.Length != 1)
        //    {
        //        throw new ArgumentException($"Expect to find one managed EXE in directory, actually found {exePaths.Length}");
        //    }
        //    return exePaths[0];
        //}

        //// call this before construction to avoid throwing on native executables
        //internal static bool IsExeManagedAssembly(string exePath) =>
        //    IsManagedAssembly(exePath) ||
        //    IsManagedAssembly(Path.ChangeExtension(exePath, "dll"));

        internal LoadedAssemblies(string exePath, IReader<T> reader)
        {
            _exePath = exePath;

            // the EXE assembly path
            var assemblyPath = IsManagedAssembly(_exePath) ? _exePath : Path.ChangeExtension(exePath, "dll");
            if (!IsExeManagedAssembly(assemblyPath))
            {
                throw new Exception($"EXE is not a managed assembly");
            }

            var frameworkName = reader.GetTargetFramework(assemblyPath);

            // the result of this is one or two paths
            // 1. the directory which contains the exe (i.e. the "app directory")
            // 2. the shared .NET directory (i.e. a subdirectory of C:\Program Files\dotnet\shared or C:\Windows\Microsoft.NET\Framework)
            var appDirectory = GetDirectoryName(assemblyPath);
            var microsoftDirectory = GetMicrosoftDirectory(assemblyPath, frameworkName);

            // if we don't pass this in ReaderParameters then Mono.Cecil will substitute in its own DefaultAssemblyResolver
            // which we don't want e.g. because it uses SearchTrustedPlatformAssemblies
            // however assert that this.Resolve won't be called until after LoadAllAssemblies returns
            //var readerParameters = new ReaderParameters { AssemblyResolver = this };
            //Func<string, AssemblyDefinition> readAssemblyFromPath = (string fileName) => AssemblyDefinition.ReadAssembly(fileName, readerParameters);

            _cache = LoadAllAssemblies(assemblyPath, reader, appDirectory, microsoftDirectory);
        }

        internal IFilter Filter => new FilterImpl(this);

        internal IReadOnlyDictionary<string, Found?> Dictionary => _cache;

        internal string ExeFileName => Path.GetFileNameWithoutExtension(_exePath);

        internal string[] MissingAssemblyNames =>
            _cache
            .Where(kv => kv.Value == null)
            .Select(kv => kv.Key)
            .Order()
            .ToArray();

        internal IEnumerable<T> GetAssemblies(IFilter? filter)
        {
            return _cache
                .Where(kv => kv.Value != null)
                .Where(kv => filter == null || !filter.IsMicrosoftAssemblyName(kv.Key))
                .Select(kv => kv.Value!.AssemblyData)
                .ToArray();
        }

        internal bool TryGetAssembly(AssemblyReference assemblyReference, out T? assemblyData)
        {
            if (_cache.TryGetValue(assemblyReference.Name, out var found) && found != null)
            {
                assemblyData = found.AssemblyData;
                return true;
            }
            assemblyData = default;
            return false;
        }

        //public AssemblyDefinition Resolve(AssemblyNameReference name)
        //{
        //    if (_cache == null)
        //    {
        //        throw new Exception("Unexpectted Resolve while initializing");
        //    }
        //    _cache.TryGetValue(name.Name, out var found);
        //    if (found == null)
        //    {
        //        throw new AssemblyResolutionException(name);
        //    }
        //    return found.AssemblyDefinition;
        //}

        //public AssemblyDefinition Resolve(AssemblyNameReference name, ReaderParameters parameters)
        //{
        //    throw new NotImplementedException();
        //}

        public void Dispose() { }

        //private static FrameworkName GetTargetFramework(string assemblyPath)
        //{
        //    // this uses AssemblyDefinition.ReadAssembly because it's complicated to read custom attribute constructor values using PEReader alone.
        //    // this is the only redundent call to AssemblyDefinition.ReadAssembly i.e. it's called once only for ever other assembly
        //    using var assembly = AssemblyDefinition.ReadAssembly(assemblyPath);
        //    if (assembly == null)
        //    {
        //        throw new Exception($"Failed to read assembly from {assemblyPath}");
        //    }
        //    var attribute = assembly.CustomAttributes.FirstOrDefault(attr => attr.AttributeType.FullName == "System.Runtime.Versioning.TargetFrameworkAttribute");
        //    if (attribute != null && attribute.ConstructorArguments.Count > 0)
        //    {
        //        var frameworkName = (string)attribute.ConstructorArguments[0].Value!;
        //        return new FrameworkName(frameworkName);
        //    }
        //    throw new ArgumentException($"TargetFrameworkAttribute not found in assembly {assemblyPath}");
        //}

        private static IReadOnlyDictionary<string, Found?> LoadAllAssemblies(
            string assemblyPath,
            //Func<string, AssemblyDefinition> readAssemblyFromPath,
            IReader<T> reader,
            string appDirectory,
            string? microsoftDirectory
            )
        {
            var results = new Dictionary<string, Found?>();
            var stack = new Stack<T>();

            void LoadFromPath(string path, bool isMicrosoft)
            {
                var assemblyData = reader.ReadAssemblyFromPath(path);
                results.Add(Path.GetFileNameWithoutExtension(path), new Found(assemblyData, isMicrosoft, path));
                stack.Push(assemblyData);
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
                var assemblyData = stack.Pop()!;
                foreach (var assemblyNameReference in reader.GetAssemblyReferences(assemblyData))
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
