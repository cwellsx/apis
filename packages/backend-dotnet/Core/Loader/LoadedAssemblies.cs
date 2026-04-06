using Core.Filter;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

using static Core.Loader.AssemblyResolverPaths;

namespace Core.Loader
{
    internal sealed class LoadedAssemblies<T, U> : ILoaded<U>, IDisposable
        where T : IDisposable
        where U : IDisposable
    {
        private class FilterImpl : IFilter
        {
            private readonly LoadedAssemblies<T, U> _self;
            internal FilterImpl(LoadedAssemblies<T, U> self)
            {
                _self = self;
            }

            public bool IsMicrosoftAssemblyName(string assemblyName) =>
                assemblyName == "mscorlib" ||
                assemblyName == "netstandard" ||
                assemblyName.StartsWith("System.") ||
                assemblyName.StartsWith("Microsoft.");


            public bool IsMicrosoftAssemblyPath(string assemblyName) => _self._cache[assemblyName]!.IsMicrosoft;
        }

        private readonly string _exePath;

        private class Found : IDisposable
        {
            internal readonly T AssemblyData;
            internal readonly bool IsMicrosoft;
            internal readonly string Path;
            internal readonly byte[] Bytes;
            internal U? PEFile;

            internal Found(T assemblyData, bool isMicrosoft, string path, byte[] bytes)
            {
                AssemblyData = assemblyData;
                IsMicrosoft = isMicrosoft;
                Path = path;
                Bytes = bytes;
            }

            public void Dispose()
            {
                AssemblyData.Dispose();
                PEFile?.Dispose();
            }
        }

        private readonly IReadOnlyDictionary<string, Found?> _cache;

        internal LoadedAssemblies(string exeOrDllPath, ILoader<T> loader, IReader<T> reader)
        {
            _exePath = exeOrDllPath;

            // the EXE assembly path
            var assemblyPath = exeOrDllPath;

            var frameworkName = reader.GetTargetFramework(assemblyPath);

            // the result of this is one or two paths
            // 1. the directory which contains the exe (i.e. the "app directory")
            // 2. the shared .NET directory (i.e. a subdirectory of C:\Program Files\dotnet\shared or C:\Windows\Microsoft.NET\Framework)
            var appDirectory = GetDirectoryName(assemblyPath);
            var microsoftDirectory = GetMicrosoftDirectory(assemblyPath, frameworkName);

            _cache = LoadAllAssemblies(assemblyPath, loader, reader, appDirectory, microsoftDirectory);
        }

        internal IFilter Filter => new FilterImpl(this);

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

        internal IEnumerable<T> GetMicrosoftAssemblies(IFilter? filter)
        {
            return _cache
                .Where(kv => kv.Value != null)
                .Where(kv => filter != null && filter.IsMicrosoftAssemblyName(kv.Key))
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

        public bool TryGetAssembly(AssemblyReference assemblyReference, ILoader<U> loader, out U? assemblyData)
        {
            if (!_cache.TryGetValue(assemblyReference.Name, out var found) && found != null)
            {
                assemblyData = default;
                return false;
            }
            if (found!.PEFile == null)
            {
                found.PEFile = loader.ReadAssemblyFromPath(found.Path, found.Bytes);
            }
            assemblyData = found.PEFile;
            return true;
        }

        private static IReadOnlyDictionary<string, Found?> LoadAllAssemblies(
            string assemblyPath,
            ILoader<T> loader,
            IReader<T> reader,
            string appDirectory,
            string? microsoftDirectory
            )
        {
            var results = new Dictionary<string, Found?>();
            var stack = new Stack<T>();

            void LoadFromPath(string path, bool isMicrosoft)
            {
                var bytes = File.ReadAllBytes(path);
                var assemblyData = loader.ReadAssemblyFromPath(path, bytes);
                results.Add(Path.GetFileNameWithoutExtension(path), new Found(assemblyData, isMicrosoft, path, bytes));
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

        public void Dispose()
        {
            foreach (var found in _cache.Values)
            {
                found?.Dispose();
            }
        }
    }
}
