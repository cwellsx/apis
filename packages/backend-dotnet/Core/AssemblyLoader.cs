using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

using Core.Extensions;
using Core.Output.Public;

namespace Core
{
    static class AssemblyLoader
    {
        const string version = "2024-07-04"; // see also src\main\shared-types\loaded\loadedVersion.ts

        internal static All LoadAssemblies(string directory)
        {
            if (!Directory.Exists(directory))
            {
                throw new Exception($"Input directory not found: `{directory}`");
            }

            var assemblyPaths = new AssemblyPaths(directory);

            var pathAssemblyResolver = new PathAssemblyResolver(assemblyPaths.Paths);

            var assemblies = new Dictionary<string, AssemblyInfo>();
            var exceptions = new List<string>();

            using (var metaDataLoadContext = new MetadataLoadContext(pathAssemblyResolver))
            {
                foreach (var path in assemblyPaths.NonMicrosoftPaths)
                {
                    try
                    {
                        Logger.Log(path);
                        var assembly = metaDataLoadContext.LoadFromAssemblyPath(path);
                        var assemblyName = GetAssemblyName(assembly);

                        // load the type and member metadata
                        var assemblyInfo = new AssemblyInfo(
                            ReferencedAssemblies: assembly.GetReferencedAssemblies().Select(GetAssemblyName).ToArray(),
                            Types: assembly.GetTypes().Select(type => TypeReader.GetTypeInfo(type)).ToArray()
                            );
                        Invariants.Verify(assemblyInfo.Types);
                        assemblies.Add(assemblyName, assemblyInfo);

                        assemblyPaths.ValidateTypes(path, assemblyInfo.Types);
                    }
                    catch (BadImageFormatException)
                    {
                        // the executable is not a .NET assembly
                    }
                    catch (Exception e)
                    {
                        exceptions.Add($"{path} -- {e.Message}");
                    }
                }
            }
            var assemblyMethodCalls = assemblyPaths.GetAssemblyMethods();

            return new All(assemblies, exceptions, version, assemblyPaths.ExeFileNames, assemblyMethodCalls);
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

        static string GetAssemblyName(AssemblyName assemblyName) => assemblyName.Name.NotNull();
        static string GetAssemblyName(Assembly assembly) => GetAssemblyName(assembly.GetName());
    }
}
