using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Core
{
    internal static class DotNetPaths
    {
        internal static (string[], string[]) FindPaths(string directory)
        {
            var dotnetCoreFiles = _dotnetCoreFiles.Value;
            var dotnetFrameworkFiles = _dotnetFrameworkFiles.Value;

            // guess which to use for this (maybe it doesn't matter and either would do
            var assemblyPaths = dotnetCoreFiles ?? dotnetFrameworkFiles;
            if (assemblyPaths == null)
            {
                throw new Exception("No version of dot net is intalled on this machine");
            }

            using var context = new MetadataLoadContext(new PathAssemblyResolver(assemblyPaths));

            bool isFramework = false;
            bool isCore = false;
            var exes = new List<string>();
            foreach (var exe in GetExes(directory))
            {
                var assembly = LoadAssembly(context, exe);
                if (assembly == null)
                {
                    continue;
                }
                var exeName = assembly.GetName().Name;
                if (exeName != null)
                {
                    exes.Add(exeName);
                }
                var targetFramework = GetTargetFramework(assembly);
                switch (targetFramework.Split(",")[0])
                {
                    case ".NETFramework":
                        isFramework = true;
                        break;
                    case ".NETCoreApp":
                        isCore = true;
                        break;
                    default:
                        throw new ArgumentException($"Unexpected TargetFramework {targetFramework}");
                }
            }

            if (exes.Count == 0)
            {
                foreach (var dll in GetDlls(directory))
                {
                    var assembly = LoadAssembly(context, dll);
                    if (assembly == null)
                    {
                        continue;
                    }
                    var targetFramework = GetTargetFramework(assembly);
                    switch (targetFramework.Split(",")[0])
                    {
                        case ".NETFramework":
                            isFramework = true;
                            break;
                        case ".NETCoreApp":
                            isCore = true;
                            break;
                        default:
                            throw new ArgumentException($"Unexpected TargetFramework {targetFramework}");
                    }
                }
            }

            Logger.Log($"Found {exes.Count} *exe, isCore:{isCore}, isFramework:{isFramework}");

            assemblyPaths = ((!isFramework && !isCore) || (isCore && isFramework) || isCore) ? dotnetCoreFiles ?? dotnetFrameworkFiles : dotnetFrameworkFiles ?? dotnetCoreFiles;
            return (assemblyPaths!, exes.ToArray());
        }

        static string GetTargetFramework(Assembly assembly)
        {
            foreach (var attribute in assembly.CustomAttributes)
            {
                try
                {
                    if (attribute.AttributeType.Name == "TargetFrameworkAttribute")
                    {
                        return (string)attribute.ConstructorArguments[0].Value!;
                    }
                }
                catch (Exception) { }
            }
            throw new Exception($"TargetFrameworkAttribute not found in {assembly.FullName}");
        }

        static Assembly? LoadAssembly(MetadataLoadContext context, string exe)
        {
            try
            {
                return context.LoadFromAssemblyPath(exe);
            }
            catch (BadImageFormatException)
            {
                var dll = Path.ChangeExtension(exe, "dll");
                try
                {
                    return File.Exists(dll) ? context.LoadFromAssemblyPath(dll) : null;
                }
                catch (BadImageFormatException)
                {
                    return null;
                }
            }
        }

        static Lazy<string[]?> _dotnetCoreFiles = new Lazy<string[]?>(() => GetDotNetCoreFiles());
        static Lazy<string[]?> _dotnetFrameworkFiles = new Lazy<string[]?>(() => GetDotNetFrameworkFiles());

        static string[]? GetDotNetCoreFiles()
        {
            Func<string, string> root = (s) => $@"C:\Program Files\dotnet\shared\Microsoft.{s}.App";
            var subdirs = new string[] { "NETCore", "AspNetCore", "WindowsDeskTop" };
            var version = FindHighestVersionUnder(root(subdirs.First()), false);
            if (version == null)
            {
                return null;
            }
            var directories = subdirs.Select(s => $@"{root(s)}\{version}");
            return GetManyDlls(directories);
        }

        static string[]? GetDotNetFrameworkFiles()
        {
            // as well as Framework there's a Framework64
            var root = @"C:\Windows\Microsoft.NET\Framework";
            var version = FindHighestVersionUnder(root, true);
            if (version == null)
            {
                return null;
            }
            var directories = new string[] { $@"{root}\{version}", $@"{root}\{version}\WPF" };
            return GetManyDlls(directories);
        }

        static string[] GetManyDlls(IEnumerable<string> directories) => directories.SelectMany(GetDlls).ToArray();
        static string[] GetDlls(string directory) => Directory.GetFiles(directory, "*.dll");
        static string[] GetExes(string directory) => Directory.GetFiles(directory, "*.exe");

        static string? FindHighestVersionUnder(string directory, bool hasPrefix)
        {
            Version? highest = null;
            string? result = null;
            foreach (var subdirectory in Directory.GetDirectories(directory))
            {
                var name = Path.GetFileName(subdirectory);
                string version;
                if (hasPrefix)
                {
                    if (name[0] != 'v')
                    {
                        continue;
                    }
                    version = name.Substring(1);
                }
                else
                {
                    version = name;
                }
                if (!Version.TryParse(version, out var found))
                {
                    continue;
                }
                if (highest == null || found > highest)
                {
                    highest = found;
                    result = name;
                }
            }
            return result;
        }
    }
}
