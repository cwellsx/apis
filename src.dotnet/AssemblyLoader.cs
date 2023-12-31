using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;
using System.Reflection;

namespace Core
{
    static class AssemblyLoader
    {
        internal static string LoadAssemblies(string directory)
        {
            if (!Directory.Exists(directory))
            {
                throw new Exception($"Input directory not found: `{directory}`");
            }
            var dotNetInstallationDirectory = GetDotNetInstallationDirectory();
            if (dotNetInstallationDirectory== null)
            {
                throw new Exception("DotNet framework installation directory not found");
            }
            var pathAssemblyResolver = new PathAssemblyResolver(GetAllFiles(directory).Concat(GetAllFiles(dotNetInstallationDirectory)));
            var when = GetDateModified(directory);
            var assemblyReader = new AssemblyReader(when);
            using (var metaDataLoadContext = new MetadataLoadContext(pathAssemblyResolver))
            {
                foreach (var path in GetFiles(directory))
                {
                    var assembly = metaDataLoadContext.LoadFromAssemblyPath(path);
                    assemblyReader.Add(assembly);
                }
            }
            return assemblyReader.ToJson();
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
                throw new Exception($"Input directory not found: `{directory}`");
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

        static string? GetDotNetInstallationDirectory()
        {
            var directories = Directory.GetDirectories(@"C:\Windows\Microsoft.NET\Framework"); // there's also a Framework64
            Version? maxVersion = null;
            string? found = null;
            foreach (var directory in directories)
            {
                var filename = Path.GetFileName(directory);
                if (filename[0] != 'v')
                {
                    continue;
                }
                var foundVersion = new Version(filename.Substring(1));
                if (maxVersion == null || foundVersion > maxVersion)
                {
                    found = directory;
                    maxVersion = foundVersion;
                }
            }
            return found;
        }
    }
}
