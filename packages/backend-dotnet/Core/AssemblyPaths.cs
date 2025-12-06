using System;
using System.Collections.Generic;
using System.Linq;

using Mono.Cecil;

using Core.Cecil;
using Found = Core.Cecil.AssemblyResolver.Found;

namespace Core
{
    internal class AssemblyPaths
    {
        AssemblyResolver _assemblyResolver;

        internal AssemblyPaths(string directory)
        {
            var exePath = AssemblyResolver.FindSingleExe(directory);
            _assemblyResolver = new AssemblyResolver(exePath);

            var missingAssemblyNames = Dictionary.Where(kvp => kvp.Value == null).Select(kvp => kvp.Key).Order().ToArray();
            if (missingAssemblyNames.Length > 0)
            {
                throw new Exception($"Missing assembly names: {string.Join(", ", missingAssemblyNames)}");
            }
        }

        // used to initialize PathAssemblyResolver
        internal IEnumerable<string> Paths => AllFound.Select(found => found.Path);

        internal IEnumerable<string> NonMicrosoftPaths => AppFound.Select(found => found.Path);

        internal Dictionary<string, Dictionary<int, Output.Public.MethodInfo>> GetAssemblyMethods() => GetAssemblyData().ToDictionary(
            assemblyData => assemblyData.Name,
            assemblyData => assemblyData.GetMethodData().ToDictionary(
                methodData => methodData.MetadataToken.ToInt32(),
                methodData => Convert(methodData)
                )
            );


        internal string[] ExeFileNames => [_assemblyResolver.ExeFileName];

        private static bool IsMicrosoftAssemblyName(string assemblyName) =>
            assemblyName == "mscorlib" ||
            assemblyName.StartsWith("System.") ||
            assemblyName.StartsWith("Microsoft.") ||
            // also don't try to reflect ICSharpCode.Decompiler
            // bcause it throws an "assembly already loaded" on System.Reflection.Metadata
            assemblyName == "ICSharpCode.Decompiler";

        private bool IsMicrosoftAssemblyPath(string assemblyName) => Dictionary[assemblyName]!.IsMicrosoft;

        private IReadOnlyDictionary<string, Found?> Dictionary => _assemblyResolver.Dictionary;
        private IEnumerable<Found> AllFound => Dictionary.Values.Where(found => found != null).Select(found => found!);
        private IEnumerable<Found> AppFound => Dictionary.Where(kvp => !IsMicrosoftAssemblyName(kvp.Key) && kvp.Value != null && !kvp.Value.IsMicrosoft).Select(kvp => kvp.Value!);
        private AssemblyData[] GetAssemblyData() => AppFound.Select(found => new AssemblyData(found.AssemblyDefinition)).ToArray();

        private Output.Public.MethodInfo Convert(MethodData methodData)
        {
            return new Output.Public.MethodInfo(
                AsText: "foo",
                Called: Convert(methodData.Called),
                Argued: Convert(methodData.Argued),
                Locals: [],
                null
                );
        }

        private Output.Public.MethodCall[]? Convert(IEnumerable<MethodReference> methodReferences)
        {
            return methodReferences
                .Where(methodReference => !IsMicrosoftAssemblyName(methodReference.DeclaringType.Scope.Name)) // don't know the Module yet
                .Select(Convert)
                .Where(methodCall => !IsMicrosoftAssemblyPath(methodCall.AssemblyName))
                .ToArray();
        }

        private Output.Public.MethodCall Convert(MethodReference methodReference)
        {
            try
            {
                var methodDefinition = methodReference.Resolve();
                return new Output.Public.MethodCall(
                    AssemblyName: methodDefinition.DeclaringType.Module.Assembly.Name.Name,
                    MetadataToken: methodDefinition.MetadataToken.ToInt32(),
                    Error: null
                    );
            }
            catch (Exception)
            {
                Logger.Log($"Failed to resolve method {methodReference}");
                var scope = methodReference.DeclaringType.Scope;
                return new Output.Public.MethodCall(
                    AssemblyName: methodReference.DeclaringType.Scope.Name,
                    MetadataToken: null, //methodReference.MetadataToken.ToInt32(),
                    Error: null //e.Message
                    );
            }
        }
    }
}
