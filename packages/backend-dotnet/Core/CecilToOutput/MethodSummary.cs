using Core.Cecil;
using Core.Id.Comparers;
using Core.Id.Methods;
using Core.Output;
using Core.Output.Ids;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    // this is an intermediary between Core.Cecil.MethodData and Core.Output.MethodInfo
    internal class MethodSummary
    {
        internal static MethodSummary[] Transform(MethodData[] assemblyMethodData, string assemblyName, CompilerGenerated compilerGenerated)
        {
            var (compilerTypes, compilerMethods) = compilerGenerated;

            var toTypeId = new ToTypeId(assemblyName);
            var toMethodId = new ToMethodId(assemblyName);

            var map = assemblyMethodData
                .Where(value => !value.IsInsignificantCompilerGenerated)
                .ToDictionary(
                methodData => methodData.MetadataToken.ToInt32(),
                methodData => new MethodSummary(methodData, toTypeId, toMethodId, IsSignificant(methodData, compilerTypes))
                );

            // replace calls from compiler methods
            foreach (var kvp in compilerMethods)
            {
                var compiler = map[kvp.Key];
                var owner = map[kvp.Value];
                owner.AddFrom(compiler);
                map.Remove(kvp.Key);
            }

            // replace calls to compiler methods
            foreach (var kvp in map)
            {
                var fromId = kvp.Key;

                Predicate<MethodId> isMatch = (methodId) =>
                {
                    var leafId = methodId.LeafId;
                    var (foundAssemblyName, metadataToken) = GetMetadataToken(leafId, assemblyName);
                    if (foundAssemblyName != assemblyName)
                    {
                        return false;
                    }
                    if (!compilerMethods.TryGetValue(metadataToken, out var foundId))
                    {
                        return false;
                    }
                    Assert(fromId == foundId);
                    return true;
                };

                var methodSummary = kvp.Value;
                methodSummary.Called.RemoveAll(isMatch);
                methodSummary.Argued.RemoveAll(isMatch);
            }

            return map.Values.ToArray();
        }

        private static (string, int) GetMetadataToken(IMethodId methodId, string assemblyName) => methodId switch
        {
            LocalMethod localMethod => (assemblyName, localMethod.MetadataToken),
            RemoteMethod remoteMethod => (remoteMethod.AssemblyName, remoteMethod.MetadataToken),
            GenericMethod genericMethod => GetMetadataToken(genericMethod.Resolved, assemblyName),
            _ => throw new System.Exception()
        };

        readonly static FullMethodIdComparer s_FullMethodIdComparer = new();

        internal MetadataToken MetadataToken { get; }
        internal string FullName { get; }
        internal List<MethodId> Called { get; }
        internal List<MethodId> Argued { get; }
        internal List<TypeId> Locals { get; }
        internal bool IsCompilerGenerated { get; }
        internal LocalMethodId LocalMethodId => new LocalMethodId(FullName, new LocalMethod(MetadataToken.ToInt32()));
        internal MethodInfo GetMethodInfo(string asText)
        {
            Assert(!IsCompilerGenerated);
            // Need to ensure references are unique -- they're stored in an SQLite table with from+to as a key field.
            var called = Called.ToHashSet(s_FullMethodIdComparer);
            var argued = Argued.Distinct(s_FullMethodIdComparer).Where(value => !called.Contains(value));

            return new MethodInfo(asText, called.ToArrayOrNull(), argued.ToArrayOrNull(), Locals.ToArrayOrNull());
        }

        private MethodSummary(MethodData methodData, ToTypeId toTypeId, ToMethodId toMethodId, Func<MethodReference, bool> isSignificant)
        {
            Assert(!methodData.IsLambdaCacheStaticCtor);

            MetadataToken = methodData.MetadataToken;
            FullName = methodData.FullName;
            Called = toMethodId.Convert(methodData.Called.Where(isSignificant)).ToList();
            Argued = toMethodId.Convert(methodData.Argued.Where(isSignificant)).ToList();
            Locals = methodData.Locals.Select(local => toTypeId.Convert(local.VariableType)).ToList();
            IsCompilerGenerated = methodData.IsCompilerOrLocalFunction;
        }

        private static Func<MethodReference, bool> IsSignificant(MethodData methodData, HashSet<int> compilerTypes) => (MethodReference methodReference) =>
        {
            var isCompilerType = compilerTypes.Contains(methodData.DeclaringType.MetadataToken.ToInt32());

            var methodDefinition = methodReference.Resolve();
            var declaringType = methodDefinition.DeclaringType;
            if (declaringType.Namespace != "System.Runtime.CompilerServices")
            {
                return true;
            }
            if (isCompilerType)
            {
                return false;
            }

            switch (declaringType.Name)
            {
                case "AsyncTaskMethodBuilder":
                case "AsyncTaskMethodBuilder`1":
                case "AsyncValueTaskMethodBuilder":
                case "AsyncValueTaskMethodBuilder`1":
                case "AsyncVoidMethodBuilder":
                    // all builder methods except Create, Start, and get_Task are used inside the compiler-generated types
                    switch (methodDefinition.Name)
                    {
                        case "Create":
                        case "Start":
                        case "get_Task":
                            break;
                        default:
                            Logger.Log($"? {methodReference}");
                            break;
                    }
                    return false;
                case "DefaultInterpolatedStringHandler":
                case "RuntimeHelpers":
                case "Unsafe":
                case "TaskAwaiter":
                case "TaskAwaiter`1":
                case "ConditionalWeakTable`2":
                case "CallSite":
                case "CallSite`1":
                    return true;
            default:
                    Logger.Log($"? {methodReference}");
                    return false;
            }
        };

        private void AddFrom(MethodSummary compiler)
        {
            Called.AddRange(compiler.Called);
            Argued.AddRange(compiler.Argued);
        }
    }
}
