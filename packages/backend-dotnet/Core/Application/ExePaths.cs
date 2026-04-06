using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection.PortableExecutable;

namespace Core.Application
{
    internal static class ExePaths
    {
        internal static string FindSingleExe(string directory)
        {
            var exePaths = GetExesFromDirectory(directory).ToArray();
            if (exePaths.Length != 1)
            {
                throw new ArgumentException($"Expect to find one managed EXE in directory, actually found {exePaths.Length}");
            }
            return exePaths[0];
        }

        private static IEnumerable<string> GetExesFromDirectory(string directory)
        {
            foreach (var exePath in Directory.GetFiles(directory).Where(IsExe))
            {
                if (IsManagedAssembly(exePath))
                {
                    yield return exePath;
                }
                else
                {
                    // also check for a DLL with the same name
                    var dllPath = Path.ChangeExtension(exePath, "dll");
                    if (File.Exists(dllPath) && IsManagedAssembly(dllPath))
                    {
                        yield return dllPath;
                    }
                }
            }
        }

        private static bool IsManagedAssembly(string path)
        {
            using var stream = File.OpenRead(path);
            using var pe = new PEReader(stream);
            return pe.HasMetadata;
        }

        private static bool IsExe(string path) => IsExtension(path, ".exe");
        private static bool IsExtension(string path, string extension) => Path.GetExtension(path).Equals(extension, StringComparison.OrdinalIgnoreCase);
    }
}
