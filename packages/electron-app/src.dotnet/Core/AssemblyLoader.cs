using Core.Extensions;
using Core.Output.Internal;
using Core.Output.Public;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Core
{
    using AssemblyDecompiled = Dictionary<TypeIdEx, TypeDecompiled>;

    static class AssemblyLoader
    {
        const string version = "2024-07-04"; // see also src\main\shared-types\loaded\loadedVersion.ts

        internal static (All, Dictionary<string, Dictionary<int, MethodDetails>>) LoadAssemblies(string directory)
        {
            if (!Directory.Exists(directory))
            {
                throw new Exception($"Input directory not found: `{directory}`");
            }
            var (dotNetPaths, exes, targetFramework) = DotNetPaths.FindPaths(directory);
            var pathAssemblyResolver = new PathAssemblyResolver(GetAllFiles(directory).Concat(dotNetPaths));

            Func<string, bool> isMicrosoftAssemblyName = (string name) =>
                IsMicrosoftAssembly(name) || dotNetPaths.Any(path => Path.GetFileNameWithoutExtension(path) == name);

            var assemblies = new Dictionary<string, AssemblyInfo>();
            var exceptions = new List<string>();
            var assembliesDecompiled = new Dictionary<string, AssemblyDecompiled>();

            using (var metaDataLoadContext = new MetadataLoadContext(pathAssemblyResolver))
            {
                foreach (var path in GetFiles(directory))
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

                        // decompile the method calls for each type
                        var assemblyDecompiled = MethodReader.GetAssemblyDecompiled(
                            path,
                            assemblyInfo,
                            isMicrosoftAssemblyName,
                            targetFramework
                            );
                        assembliesDecompiled.Add(assemblyName, assemblyDecompiled);
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
            var assemblyMethodDetails = MethodFinder.GetAssemblyMethods(assembliesDecompiled);
            var assemblyMethodCalls = new Dictionary<string, Dictionary<int, Output.Public.MethodInfo>>(assemblyMethodDetails
                .Select(kvp => new KeyValuePair<string, Dictionary<int, Output.Public.MethodInfo>>(
                    kvp.Key,
                    new Dictionary<int, Output.Public.MethodInfo>(kvp.Value.Select(kvp => new KeyValuePair<int, Output.Public.MethodInfo>(
                        kvp.Key,
                        new Output.Public.MethodInfo(kvp.Value)
                        ))))));
            return (
                new All(assemblies, exceptions, version, exes, assemblyMethodCalls),
                assemblyMethodDetails
                );
        }

        internal static string GetDateModified(string directory)
        {
            DateTime? maxDateTime = null;
            foreach (var path in GetFiles(directory))
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

        static IEnumerable<string> GetFiles(string directory) => GetAllFiles(directory).Where(path => !IsMicrosoftPath(path));

        static IEnumerable<string> GetAllFiles(string directory) => Directory.GetFiles(directory).Where(IsExecutable);

        static bool IsExecutable(string path)
        {
            switch (Path.GetExtension(path))
            {
                case ".exe":
                case ".dll":
                    return true;
                default:
                    return false;
            }
        }

        static bool IsMicrosoftPath(string path) => IsMicrosoftAssembly(Path.GetFileNameWithoutExtension(path));
        static bool IsMicrosoftAssembly(string assemblyName) =>
            assemblyName == "mscorlib" ||
            assemblyName.StartsWith("System.") ||
            assemblyName.StartsWith("Microsoft.") ||
            // also don't try to reflect ICSharpCode.Decompiler
            // bcause it throws an "assembly already loaded" on System.Reflection.Metadata
            assemblyName == "ICSharpCode.Decompiler"
            // Core.IL uses (and encapsulates) ICSharpCode.Decompiler types but mostly decompiles with just a couple of errors
            // assemblyName == "Core.IL"
            ;

        static string GetAssemblyName(AssemblyName assemblyName) => assemblyName.Name.NotNull();
        static string GetAssemblyName(Assembly assembly) => GetAssemblyName(assembly.GetName());
    }
}
