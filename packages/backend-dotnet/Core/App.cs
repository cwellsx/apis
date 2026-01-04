using Core.Cecil;
using Core.Loader;
using Core.Output.Public;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
//using System.Reflection;

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

            var exePath = AssemblyResolverPaths.FindSingleExe(directory);
            var assemblyResolver = new AssemblyResolver(exePath);
            var loadedAssemblies = assemblyResolver.LoadedAssemblies;

            var missingAssemblyNames = loadedAssemblies.MissingAssemblyNames;
            if (missingAssemblyNames.Length > 0)
            {
                throw new Exception($"Missing assembly names: {string.Join(", ", missingAssemblyNames)}");
            }


            //var assemblyPaths = new AssemblyPaths(directory);

            //var pathAssemblyResolver = new PathAssemblyResolver(assemblyPaths.Paths);

            var assemblies = new Dictionary<string, AssemblyInfo>();
            var exceptions = new List<string>();
            var compilerMethods = new Dictionary<string, Dictionary<int, int>>();
            var assemblyMethods = new Dictionary<string, Dictionary<int, MethodInfo>>();

            //using (var metaDataLoadContext = new MetadataLoadContext(pathAssemblyResolver))
            var filter = loadedAssemblies.Filter;
            foreach (var assemblyData in loadedAssemblies.GetAssemblies(filter))
            {
                try
                {
                    //var assembly = metaDataLoadContext.LoadFromAssemblyPath(path);
                    var assemblyName = assemblyData.Name;
                    Logger.Log(assemblyName);

                    // load the type and member metadata
                    var assemblyInfo = new AssemblyInfo(
                        ReferencedAssemblies: assemblyData.AssemblyReferences.Select(assemblyReference => assemblyReference.Name).ToArray(),
                        //Types: assembly.GetTypes().Select(type => TypeReader.GetTypeInfo(type)).ToArray()
                        Types: assemblyData.TypeDefinitions.Select(CecilToOutput.TypeInfo.Transform).ToArray()
                        );
                    Invariants.Verify(assemblyInfo.Types);
                    assemblies.Add(assemblyName, assemblyInfo);

                    //assemblyPaths.ValidateTypes(path, assemblyInfo.Types);
                    compilerMethods.Add(assemblyName, CecilToOutput.CompilerMethods.Transform(assemblyData));

                    assemblyMethods.Add(assemblyName, assemblyData.MethodData.ToDictionary(
                        methodData => methodData.MetadataToken.ToInt32(),
                        methodData => CecilToOutput.MethodInfo.Transform(methodData, filter)
                        ));
                }
                catch (Exception e)
                {
                    exceptions.Add($"{assemblyData.Name} -- {e.Message}");
                }
            }

            return new All(assemblies, exceptions, version, [loadedAssemblies.ExeFileName], assemblyMethods, compilerMethods);
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

        //static string GetAssemblyName(AssemblyName assemblyName) => assemblyName.Name.NotNull();
        //static string GetAssemblyName(Assembly assembly) => GetAssemblyName(assembly.GetName());
    }
}
