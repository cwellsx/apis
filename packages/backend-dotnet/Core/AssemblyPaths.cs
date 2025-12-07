using System;
using System.Collections.Generic;
using System.Linq;

using Mono.Cecil;
using Mono.Cecil.Cil;

using Core.Cecil;
using Found = Core.Cecil.AssemblyResolver.Found;

namespace Core
{
    internal class AssemblyPaths
    {
        AssemblyResolver _assemblyResolver;
        SortedDictionary<string, AssemblyData> _foundAssemblies; // key is path

        internal AssemblyPaths(string directory)
        {
            var exePath = AssemblyResolver.FindSingleExe(directory);
            _assemblyResolver = new AssemblyResolver(exePath);

            var missingAssemblyNames = _assemblyResolver.Dictionary.Where(kvp => kvp.Value == null).Select(kvp => kvp.Key).Order().ToArray();
            if (missingAssemblyNames.Length > 0)
            {
                throw new Exception($"Missing assembly names: {string.Join(", ", missingAssemblyNames)}");
            }

            var foundKvps = _assemblyResolver.Dictionary.Where(kvp => kvp.Value != null).Select(kvp => new KeyValuePair<string, Found>(kvp.Key, kvp.Value!)).ToArray();

            _foundAssemblies = new SortedDictionary<string, AssemblyData>(foundKvps
                .Where(kvp => !IsMicrosoftAssemblyName(kvp.Key) && !kvp.Value.IsMicrosoft)
                .ToDictionary(kvp => kvp.Value.Path, kvp => new AssemblyData(kvp.Value.AssemblyDefinition))
                );

            Paths = foundKvps.Select(kvp => kvp.Value.Path).ToArray();
        }

        
        internal string[] Paths { get; } // used to initialize PathAssemblyResolver

        internal IEnumerable<string> NonMicrosoftPaths => _foundAssemblies.Keys;

        internal Dictionary<string, Dictionary<int, Output.Public.MethodInfo>> GetAssemblyMethods() => _foundAssemblies.Values.ToDictionary(
            assemblyData => assemblyData.Name,
            assemblyData => assemblyData.GetMethodData().ToDictionary(
                methodData => methodData.MetadataToken.ToInt32(),
                methodData => Convert(methodData)
                )
            );

        internal void ValidateTypes(string path, Output.Public.TypeInfo[] types)
        {
            var assemblyData = _foundAssemblies[path];

            var reflectedTypes = types.ToDictionary(t => t.TypeId?.MetadataToken ?? 0, t => t);
            var cecilTypeTokens = assemblyData.GetTypeMetadataTokens().ToList();

            var notReflected = cecilTypeTokens.Except(reflectedTypes.Keys).ToList();
            var notDefined = reflectedTypes.Keys.Except(cecilTypeTokens).ToList();

            Logger.Log($"types: {types.Length}");
            Logger.Log($"reflectedTypes: {reflectedTypes.Count}");
            Logger.Log($"definedTypes: {cecilTypeTokens.Count}");
            Logger.Log($"notReflected: {notReflected.Count}");
            Logger.Log($"notDefined: {notDefined.Count}");
        }

        internal string[] ExeFileNames => [_assemblyResolver.ExeFileName];

        private static bool IsMicrosoftAssemblyName(string assemblyName) =>
            assemblyName == "mscorlib" ||
            assemblyName == "netstandard" ||
            assemblyName.StartsWith("System.") ||
            assemblyName.StartsWith("Microsoft.") ||
            // also don't try to reflect ICSharpCode.Decompiler
            // bcause it throws an "assembly already loaded" on System.Reflection.Metadata
            assemblyName == "ICSharpCode.Decompiler";

        private bool IsMicrosoftAssemblyPath(string assemblyName) => _assemblyResolver.Dictionary[assemblyName]!.IsMicrosoft;

        private Output.Public.MethodInfo Convert(MethodData methodData)
        {
            return new Output.Public.MethodInfo(
                AsText: "foo",
                Called: Convert(methodData.Called),
                Argued: Convert(methodData.Argued),
                Locals: Convert(methodData.Locals.Where(IsSimple)),
                null
                );
        }

        private bool IsSimple(VariableReference variableReference) => IsSimple(variableReference.VariableType);

        private bool IsSimple(TypeReference typeReference) =>
            !typeReference.IsArray &&
            !typeReference.IsByReference &&
            !typeReference.IsPointer &&
            !typeReference.IsPinned &&
            !typeReference.IsGenericInstance &&
            !typeReference.IsGenericParameter &&
            !typeReference.IsFunctionPointer &&
            !typeReference.IsPrimitive;

        private Output.Public.MethodCall[]? Convert(IEnumerable<MethodReference> methodReferences)
        {
            return methodReferences
                .Where(methodReference => !IsMicrosoftAssemblyName(methodReference.DeclaringType.Scope.Name)) // don't know the Module yet
                .Select(Convert)
                .Where(methodCall => !IsMicrosoftAssemblyPath(methodCall.AssemblyName))
                .ToArray();
        }

        private Output.Public.LocalsType[]? Convert(IEnumerable<VariableReference> variableReferences)
        {
            return variableReferences
                .Where(variableReference => !IsMicrosoftAssemblyName(variableReference.VariableType.Scope.Name)) // don't know the Module yet
                .Select(Convert)
                .Where(localsType => !IsMicrosoftAssemblyPath(localsType.AssemblyName))
                .Distinct()
                .ToArray();
        }

        private Output.Public.MethodCall Convert(MethodReference methodReference)
        {
            try
            {
                var methodDefinition = methodReference.Resolve();
                return new Output.Public.MethodCall(
                    AssemblyName: methodDefinition.DeclaringType.Module.Assembly.Name.Name,
                    MetadataToken: methodDefinition.MetadataToken.ToInt32()
                    );
            }
            catch (Exception)
            {
                Logger.Log($"Failed to resolve method {methodReference}");
                var scope = methodReference.DeclaringType.Scope;
                return new Output.Public.MethodCall(
                    AssemblyName: scope.Name,
                    MetadataToken: null //methodReference.MetadataToken.ToInt32(),                  
                    );
            }
        }

        private Output.Public.LocalsType Convert(VariableReference variableReference)
        {
            try
            {
                var variableDefinition = variableReference.Resolve();
                // TODO there's so
                if (0 == (variableDefinition.VariableType.MetadataToken.ToInt32() & 0xFFFFFF))
                {
                    var scope = variableReference.VariableType.Scope as AssemblyNameReference;
                    var resolvedAssembly = _assemblyResolver.Resolve(scope!);
                    throw new ArgumentException("nil token");
                }
                return new Output.Public.LocalsType(
                    AssemblyName: variableDefinition.VariableType.Module.Assembly.Name.Name,
                    MetadataToken: variableDefinition.VariableType.MetadataToken.ToInt32(),
                    null
                    );
            }
            catch (Exception)
            {
                Logger.Log($"Failed to resolve variable {variableReference}");
                var scope = variableReference.VariableType.Scope;
                return new Output.Public.LocalsType(
                    AssemblyName: scope.Name,
                    MetadataToken: null, //methodReference.MetadataToken.ToInt32(),
                    null
                    );
            }
        }
    }
}
