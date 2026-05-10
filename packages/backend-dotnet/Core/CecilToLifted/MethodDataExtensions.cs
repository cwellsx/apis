using Core.Cecil;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToLifted.Private
{
    internal static class MethodDataExtensions
    {
        private static TypeDefinition? OwnStateMachineType(this MethodData methodData)
        {
            TypeDefinition? found = null;
            foreach (var customAttribute in methodData.MethodDefinition.CustomAttributes)
            {
                switch (customAttribute.AttributeType.FullName)
                {
                    case "System.Runtime.CompilerServices.AsyncStateMachineAttribute": // method returns async Task
                    case "System.Runtime.CompilerServices.IteratorStateMachineAttribute": // method returns IEnumerable
                        break;
                    default:
                        continue;
                }

                Assert(customAttribute.ConstructorArguments.Count == 1);
                var argument = customAttribute.ConstructorArguments[0];
                Assert(argument.Type.FullName == "System.Type");
                var typeReference = argument.Value as TypeReference;
                Assert(typeReference != null);
                var resolvedType = typeReference.Resolve();
                Assert(resolvedType != null);

                Assert(found == null); // assert each method is one or the other
                found = resolvedType;
            }
            return found;
        }

        internal static IEnumerable<TypeDefinition> OwnCompilerTypes(this MethodData methodData)
        {
            var methodDefinition = methodData.MethodDefinition;
            var result = new List<TypeDefinition>();

            foreach (var methodReference in methodData.NewObj)
            {
                var declaringType = methodReference.DeclaringType;
                if (declaringType.ReferencedAssemblyName() != methodDefinition.AssemblyName())
                {
                    // compiler-generated typed are necessarily in the same assembly
                    continue;
                }
                var resolvedType = declaringType.Resolve();
                if (resolvedType.IsSignificantCompilerGenerated())
                {
                    if (resolvedType.IsLambdaCache() && !methodDefinition.IsLambdaCacheStaticCtor())
                    {
                        throw new Exception();
                    }
                    result.Add(resolvedType);
                }
            }

            var ownStateMachineType = methodData.OwnStateMachineType();
            if (ownStateMachineType != null)
            {
                result.Add(ownStateMachineType);
            }

            return result.Distinct();
        }

        private static IEnumerable<MethodDefinition> OwnMethodDefinitions(this MethodData methodData) =>
            methodData.Argued.Concat(methodData.Called)
            // compiler-generated typed are necessarily in the same assembly
            .Where(mr => mr.DeclaringType.ReferencedAssemblyName() == methodData.MethodDefinition.AssemblyName())
            .Select(mr => mr.Resolve());

        internal static IEnumerable<MethodDefinition> OwnLamdaMethods(this MethodData methodData) =>
            methodData.OwnMethodDefinitions()
            .Where(md => md.DeclaringType.IsLambdaCache())
            .ToList()
            .Distinct();

        internal static IEnumerable<MethodDefinition> OwnLocalFunctions(this MethodData methodData) =>
            methodData.OwnMethodDefinitions()
            .Where(md => md.IsLocalFunction())
            .ToList()
            .Distinct();

        internal static bool IsCompilerOrLocalFunction(this MethodData methodData) => methodData.DeclaringType.IsCompilerGenerated()
            || methodData.MethodDefinition.IsLocalFunction()
            ;

        internal static bool IsLambdaOrLocalFunction(this MethodData methodData) => methodData.DeclaringType.IsLambdaCache()
            || methodData.MethodDefinition.IsLocalFunction()
            ;

        internal static bool IsLocalFunction(this MethodData methodData) => methodData.MethodDefinition.IsLocalFunction();

        internal static bool IsLambdaCacheStaticCtor(this MethodData methodData) => methodData.MethodDefinition.IsLambdaCacheStaticCtor();
        internal static bool IsInsignificantCompilerGenerated(this MethodData methodData) => methodData.MethodDefinition.IsInsignificantCompilerGenerated();
    }
}
