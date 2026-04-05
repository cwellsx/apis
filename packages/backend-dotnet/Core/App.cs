using Core.Output;
using Core.CecilToOutput;

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Core
{
    static class App
    {
        const string version = "2024-07-04"; // see also src\main\shared-types\loaded\loadedVersion.ts

        internal static All LoadAssemblies(string directory)
        {
            if (!Directory.Exists(directory))
            {
                throw new Exception($"Input directory not found: `{directory}`");
            }

            var exePath = ExePaths.FindSingleExe(directory);
            using var cecilAssemblyResolver = new Cecil.AssemblyResolver(exePath);
            var loadedAssemblies = cecilAssemblyResolver.LoadedAssemblies;

            var ilspyAssemblyResolver = new Decompiler.AssemblyResolver(loadedAssemblies);

            var missingAssemblyNames = loadedAssemblies.MissingAssemblyNames;
            if (missingAssemblyNames.Length > 0)
            {
                throw new Exception($"Missing assembly names: {string.Join(", ", missingAssemblyNames)}");
            }

            var assemblies = new Dictionary<string, AssemblyInfo>();
            var exceptions = new List<string>();
            var compilerMethods = new Dictionary<string, Dictionary<int, int>>();
            var assemblyMethods = new Dictionary<string, Dictionary<int, MethodInfo>>();

            var filter = loadedAssemblies.Filter;
            foreach (var assemblyData in loadedAssemblies.GetAssemblies(filter))
            {
                try
                {
                    var assemblyName = assemblyData.Name;
                    Logger.Log(assemblyName);

                    var toTypeDefInfo = new ToTypeInfo(assemblyName);

                    var assemblyInfo = new AssemblyInfo(
                        ReferencedAssemblies: assemblyData.AssemblyReferences.Select(assemblyReference => assemblyReference.Name).ToArray(),
                        TypeInfos: assemblyData.TypeDefinitions.Select(toTypeDefInfo.Transform).ToArray()
                        );

                    assemblies.Add(assemblyName, assemblyInfo);

                    compilerMethods.Add(assemblyName, CompilerMethods.Transform(assemblyData));

                    var decompiler = new Decompiler.AssemblyDecompiler(assemblyName, ilspyAssemblyResolver);

                    var toMethodInfo = new ToMethodInfo(assemblyName);
                    assemblyMethods.Add(assemblyName, assemblyData.MethodData.ToDictionary(
                        methodData => methodData.MetadataToken.ToInt32(),
                        methodData =>
                        {
                            var asText = decompiler.DecompileMethod(methodData.MetadataToken.ToInt32());
                            return ToMethodInfo.Transform(methodData, asText, filter);
                        }
                        ));
                }
                catch (Exception e)
                {
                    exceptions.Add($"{assemblyData.Name} -- {e.Message}");
                }
            }
            var microsoftAssemblyNames = loadedAssemblies.GetMicrosoftAssemblies(filter).Select(assembly => assembly.Name).ToArray();

            return new All(assemblies, exceptions, version, [loadedAssemblies.ExeFileName], assemblyMethods, compilerMethods, microsoftAssemblyNames);
        }

        internal static string GetDateModified(string directory)
        {
            DateTime? maxDateTime = null;
            foreach (var path in Directory.GetFiles(directory, "*.dll"))
            {
                DateTime modified = File.GetLastWriteTime(path);
                if (maxDateTime == null || modified > maxDateTime)
                {
                    maxDateTime = modified;
                }
            }
            if (maxDateTime == null)
            {
                throw new Exception($"Input directory contains no DLLs: `{directory}`");
            }
            return maxDateTime.Value.ToUniversalTime().ToString("yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fff'Z'");
        }
    }
}
