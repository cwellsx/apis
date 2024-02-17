using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Core
{
    static class AssemblyLoader
    {
        internal static string LoadAssemblies(string directory, bool prettyPrint)
        {
            if (!Directory.Exists(directory))
            {
                throw new Exception($"Input directory not found: `{directory}`");
            }
            var (dotNetPaths, exes) = DotNetPaths.FindPaths(directory);
            var pathAssemblyResolver = new PathAssemblyResolver(GetAllFiles(directory).Concat(dotNetPaths));
            var assemblyReader = new AssemblyReader(exes);
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
            return assemblyReader.ToJson(prettyPrint);
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

        static IEnumerable<string> GetFiles(string directory) => GetAllFiles(directory).Where(path => !IsMicrosoft(path));

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

        static bool IsMicrosoft(string path)
        {
            var filename = Path.GetFileName(path);
            return filename.StartsWith("System.") || filename.StartsWith("Microsoft.");
        }
    }
}
