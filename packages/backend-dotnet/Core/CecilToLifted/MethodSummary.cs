using Core.Cecil;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;
using Core.CecilToLifted.Private;

namespace Core.CecilToLifted
{
    // this is an intermediary between Core.Cecil.MethodData and Core.Output.MethodInfo
    internal class MethodSummary
    {
        internal static MethodSummary[] Transform(MethodData[] assemblyMethodData, string assemblyName, CompilerGenerated compilerGenerated)
        {
            var (_, compilerTypes, compilerMethods) = compilerGenerated;

            var map = assemblyMethodData
                .Where(value => !value.IsInsignificantCompilerGenerated())
                .ToDictionary(
                methodData => methodData.MetadataToken.ToInt32(),
                methodData => new MethodSummary(methodData)
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

                Predicate<MethodReference> isMatch = (methodReference) =>
                {
                    if (methodReference.DeclaringType.ReferencedAssemblyName() != assemblyName)
                    {
                        // compiler-generated typed are necessarily in the same assembly
                        return false;
                    }
                    var methodDefinition = methodReference.Resolve();
                    Assert(methodDefinition.DeclaringType.AssemblyName() == assemblyName);

                    var metadataToken = methodDefinition.MetadataToken.ToInt32();
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

            // remove remaining compiler-generated types and methods
            var methodSummaries = map.Values.ToList();

            methodSummaries.RemoveAll(methodSummary => !compilerGenerated.IsUserDefined(methodSummary._declaringType));
            methodSummaries.ForEach(methodSummary =>
            {
                methodSummary.Called.RemoveAll(methodReference => !compilerGenerated.IsUserDefined(methodReference));
                methodSummary.Argued.RemoveAll(methodReference => !compilerGenerated.IsUserDefined(methodReference));
                methodSummary.Locals.RemoveAll(typeReference => !compilerGenerated.IsUserDefined(typeReference));
            });

            return methodSummaries.ToArray();
        }

        internal MetadataToken MetadataToken { get; }

        internal string FullName { get; }
        internal List<MethodReference> Called { get; }
        internal List<MethodReference> Argued { get; }
        internal List<TypeReference> Locals { get; }
        internal bool IsCompilerGenerated { get; }

        private readonly TypeDefinition _declaringType;

        private MethodSummary(MethodData methodData)
        {
            Assert(!methodData.IsLambdaCacheStaticCtor());

            MetadataToken = methodData.MetadataToken;
            FullName = methodData.FullName;

            Called = methodData.Called.ToList();
            Argued = methodData.Argued.ToList();
            Locals = methodData.Locals.Select(variableReference => variableReference.VariableType).ToList();

            IsCompilerGenerated = methodData.IsCompilerOrLocalFunction();

            _declaringType = methodData.DeclaringType;
        }

        private void AddFrom(MethodSummary compiler)
        {
            Called.AddRange(compiler.Called.Where(methodReference => !CompilerGenerated.IsCompilerService(methodReference)));
            Argued.AddRange(compiler.Argued.Where(methodReference => !CompilerGenerated.IsCompilerService(methodReference)));
        }
    }
}
