using Core.CecilToLifted;
using Core.CecilToOutput;
using Core.FullNames;
using Core.Output;
using Core.Output.Ids;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Core.Application
{
    static class App
    {
        const string version = "2026-04-22"; // see also src\main\shared-types\loaded\loadedVersion.ts

        internal static All LoadAssemblies(string directoryOrExe)
        {
            string directory;
            string? filename;
            if (File.Exists(directoryOrExe))
            {
                directory = Path.GetDirectoryName(directoryOrExe) ?? throw new Exception($"Unknown directory name: `{directoryOrExe}`");
                filename = Path.GetFileName(directoryOrExe);
            }
            else if (Directory.Exists(directoryOrExe))
            {
                directory = directoryOrExe;
                filename = null;
            }
            else
            {
                throw new Exception($"Input directory or file not found: `{directoryOrExe}`");
            }

            var exePath = ExePaths.FindSingleExe(directory, filename);

            // Cecil.AssemblyResolver uses logic from the Core.Loader namespace
            using var cecilAssemblyResolver = new Cecil.AssemblyResolver(exePath);

            // LoadedAssemblies has a dictionary of Core.Cecil.AssemblyData
            var loadedAssemblies = cecilAssemblyResolver.LoadedAssemblies;

            // Decompiler.AssemblyResolver reuses LoadedAssemblies found by Cecil.AssemblyResolver
            var ilspyAssemblyResolver = new Decompiler.AssemblyResolver(loadedAssemblies);

            var missingAssemblyNames = loadedAssemblies.MissingAssemblyNames;
            if (missingAssemblyNames.Length > 0)
            {
                //throw new Exception($"Missing assembly names: {string.Join(", ", missingAssemblyNames)}");
                Logger.Log($"Missing assembly names: {string.Join(", ", missingAssemblyNames)}");
            }

            var assemblies = new AssemblyMap<AssemblyInfo>();
            var exceptions = new List<string>();
            var assemblyMethods = new AssemblyMap<Dictionary<LocalMethodId, MethodInfo>>();

            var filter = loadedAssemblies.Filter;
            foreach (var assemblyData in loadedAssemblies.GetAssemblies(filter))
            {
                try
                {
                    var assemblyName = assemblyData.Name;
                    Logger.Log(assemblyName);

                    var compilerGenerated = CompilerGeneratedFactory.Create(assemblyData);
                    var methodSummaries = MethodSummary.Transform(assemblyData.MethodData, assemblyName, compilerGenerated);

                    // create AssemblyInfo

                    var tokenMaps = TokenMaps.CreateNew();

                    var toTypeInfo = ToTypeInfo.CreateToOutputTypeInfo(assemblyData.Name, compilerGenerated, tokenMaps);

                    var typeInfos = assemblyData
                        .GetTypeDefinitions(compilerGenerated.IsUserDefined)
                        .Select(typeDefinition => toTypeInfo.Transform(typeDefinition))
                        .ToArray();

                    var assemblyInfo = new AssemblyInfo(
                        ReferencedAssemblies: assemblyData.AssemblyReferences.Select(assemblyReference => assemblyReference.Name).ToArray(),
                        TypeInfos: typeInfos,
                        tokenMaps.TypeSpecs,
                        tokenMaps.MethodSpecs
                        );

                    assemblies.Add(assemblyName, assemblyInfo);

                    // create Dictionary<LocalMethodId, MethodInfo>

                    var decompiler = new Decompiler.AssemblyDecompiler(assemblyName, ilspyAssemblyResolver);

                    var methodInfos = ToMethodInfo.Convert(assemblyName, methodSummaries, decompiler.DecompileMethod, tokenMaps, compilerGenerated.LiftGenericParameter);

                    assemblyMethods.Add(assemblyName, methodInfos);
                }
                catch (Exception e)
                {
                    exceptions.Add($"{assemblyData.Name} -- {e.Message}");
                }
            }

            Logger.Write("Resolving System references... ");
            var empty = new AssemblyMap<AssemblyInfo>();
            var all = new All(assemblies, exceptions, version, [loadedAssemblies.ExeFileName], assemblyMethods, empty);
            all = AllNamesFetched.Iterate(all, loadedAssemblies.GetMicrosoftAssemblies(filter));
            Logger.Log("done.");
            return all;
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
