using System;
using System.Collections.Generic;
using System.Linq;

using Core.Cecil;
using Found = Core.Cecil.AssemblyResolver.Found;

namespace Core
{
    internal class AssemblyPaths
    {
        private class Filter : Transform.IFilter
        {
            private readonly AssemblyPaths _assemblyPaths;
            internal Filter(AssemblyPaths assemblyPaths)
            {
                _assemblyPaths = assemblyPaths;
            }
            public bool IsMicrosoftAssemblyName(string assemblyName) => AssemblyPaths.IsMicrosoftAssemblyName(assemblyName);
            public bool IsMicrosoftAssemblyPath(string assemblyName) => _assemblyPaths.IsMicrosoftAssemblyPath(assemblyName);
        }

        AssemblyResolver _assemblyResolver;
        SortedDictionary<string, AssemblyData> _foundAssemblies; // key is path
        string[] _paths;
        Transform.IFilter _filter;

        internal AssemblyPaths(string directory)
        {
            var exePath = AssemblyResolver.FindSingleExe(directory);
            _assemblyResolver = new AssemblyResolver(exePath);

            var missingAssemblyNames = _assemblyResolver.Dictionary.Where(kvp => kvp.Value == null).Select(kvp => kvp.Key).Order().ToArray();
            if (missingAssemblyNames.Length > 0)
            {
                throw new Exception($"Missing assembly names: {string.Join(", ", missingAssemblyNames)}");
            }

            var foundKvps = _assemblyResolver.Dictionary.Where(kvp => kvp.Value != null).Select(kvp => new KeyValuePair<string, Found>(kvp.Key, kvp.Value!)).ToArray();

            _foundAssemblies = new SortedDictionary<string, AssemblyData>(foundKvps
                .Where(kvp => !IsMicrosoftAssemblyName(kvp.Key) && !kvp.Value.IsMicrosoft)
                .ToDictionary(kvp => kvp.Value.Path, kvp => new AssemblyData(kvp.Value.AssemblyDefinition))
                );

            _paths = foundKvps.Select(kvp => kvp.Value.Path).ToArray();
            _filter = new Filter(this);
        }


        internal string[] Paths => _paths; // used to initialize PathAssemblyResolver

        internal IEnumerable<string> NonMicrosoftPaths => _foundAssemblies.Keys;

        internal Dictionary<string, Dictionary<int, Output.Public.MethodInfo>> GetAssemblyMethods() => _foundAssemblies.Values.ToDictionary(
            assemblyData => assemblyData.Name,
            assemblyData => assemblyData.MethodData.ToDictionary(
                methodData => methodData.MetadataToken.ToInt32(),
                methodData => Transform.ToMethodInfo(methodData, _filter)
                )
            );

        internal void ValidateTypes(string path, Output.Public.TypeInfo[] types)
        {
            var assemblyData = _foundAssemblies[path];
            Transform.ValidateTypes(types, assemblyData.TypeDefinitions);

            Logger.Log($"Methods: {assemblyData.MethodData.Length}");
        }

        internal string[] ExeFileNames => [_assemblyResolver.ExeFileName];

        private static bool IsMicrosoftAssemblyName(string assemblyName) =>
            assemblyName == "mscorlib" ||
            assemblyName == "netstandard" ||
            assemblyName.StartsWith("System.") ||
            assemblyName.StartsWith("Microsoft.") ||
            // also don't try to reflect ICSharpCode.Decompiler
            // bcause it throws an "assembly already loaded" on System.Reflection.Metadata
            assemblyName == "ICSharpCode.Decompiler";

        private bool IsMicrosoftAssemblyPath(string assemblyName) => _assemblyResolver.Dictionary[assemblyName]!.IsMicrosoft;


    }
}
