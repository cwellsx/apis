using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Core
{
    static class AssemblyLoader
    {
        internal static (AssemblyReader, MethodReader) LoadAssemblies(string directory, bool prettyPrint)
        {
            if (!Directory.Exists(directory))
            {
                throw new Exception($"Input directory not found: `{directory}`");
            }
            var (dotNetPaths, exes) = DotNetPaths.FindPaths(directory);
            var pathAssemblyResolver = new PathAssemblyResolver(GetAllFiles(directory).Concat(dotNetPaths));

            Func<string?, bool> isMicrosoftAssemblyName = (string? name) => name != null &&
                (IsMicrosoftAssembly(name) || dotNetPaths.Any(path => Path.GetFileNameWithoutExtension(path) == name));

            var methodReader = new MethodReader(isMicrosoftAssemblyName);

            var assemblyReader = new AssemblyReader(exes, methodReader);
            using (var metaDataLoadContext = new MetadataLoadContext(pathAssemblyResolver))
            {
                foreach (var path in GetFiles(directory))
                {
                    try
                    {
                        var assembly = metaDataLoadContext.LoadFromAssemblyPath(path);
                        assemblyReader.Add(assembly, path);
                    }
                    catch (BadImageFormatException)
                    {
                        // the executable is not a .NET assembly
                    }
                }
            }
            return (assemblyReader, methodReader);
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
            assemblyName == "ICSharpCode.Decompiler" ||
            // ditto Core.IL which uses (and encapsulates) ICSharpCode.Decompiler types
            assemblyName == "Core.IL";
    }
}
