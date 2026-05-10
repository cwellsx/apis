using Core.Cecil;
using Core.CecilToLifted.Private;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToLifted
{
    internal record OwnedMethods(
        (MethodData ownerMethodData, TypeDefinition typeDefinition)[] OwnedCompilerTypes,
        (MethodData ownerMethodData, MethodDefinition ownLambdaMethod)[] OwnedLambdaMethods,
        (MethodData ownerMethodData, MethodDefinition ownLocalFunction)[] OwnedLocalFunctions
    )
    {
        internal static OwnedMethods FromAssemblyData(AssemblyData assemblyData)
        {
            var allMethodData = assemblyData.MethodData
                // exclude the <>c class which is not really a static class, it's a singleton with a static constructor
                .Where(methodData => !methodData.IsLambdaCacheStaticCtor())
                .ToArray();

            // compiler types which are referenced via Newobj in methods
            // or via AsyncStateMachineAttribute or IteratorStateMachineAttribute
            var ownedCompilerTypes = allMethodData
                .SelectMany(methodData => OwnCompilerTypes(methodData)
                .Select(typeDefinition => (methodData, typeDefinition))
                ).ToArray();

            // assert that resolvedTypes includes all compiler-generated types except the <>c class
            var ownCompilerTypeIds = new HashSet<MetadataToken>(ownedCompilerTypes.Select(t => t.typeDefinition.MetadataToken));
            var allCompilerTypes = assemblyData.GetTypeDefinitions(typeDefinition => typeDefinition.IsSignificantCompilerGenerated()).ToArray();
            if (allCompilerTypes.Any(typeDefinition => !ownCompilerTypeIds.Contains(typeDefinition.MetadataToken) && !typeDefinition.IsLambdaCache()))
            {
                throw new Exception("Some compiler-generated types were not resolved");
            }

            var ownedLambdaMethods = allMethodData
                // we want to know who's calling which methods of the <>c class
                // it's not really a static class, it's a singleton with a static constructor
                .SelectMany(ownerMethodData => OwnLamdaMethods(ownerMethodData)
                .Select(ownLambdaMethod => (ownerMethodData, ownLambdaMethod))
                ).ToArray();

            var ownedLocalFunctions = allMethodData
                // we want to know who's calling which local functions
                .SelectMany(ownerMethodData => OwnLocalFunctions(ownerMethodData)
                .Select(ownLocalFunction => (ownerMethodData, ownLocalFunction))
                ).ToArray();

            // assert that resolvedMethods includes all compiler-generated methods of the <>c class
            var allCompilerMethodIds = allCompilerTypes
                .Where(PrivateExtensions.IsLambdaCache)
                .SelectMany(typeDefinition => typeDefinition.Methods)
                .Where(methodDefinition => !methodDefinition.IsConstructor)
                .Select(methodDefinition => methodDefinition.MetadataToken)
                .ToHashSet();
            var ownedMethodIds = new HashSet<MetadataToken>(ownedLambdaMethods.Select(t => t.ownLambdaMethod.MetadataToken));
            if (!ownedMethodIds.SetEquals(allCompilerMethodIds))
            {
                throw new Exception("Some compiler-generated methods were not resolved");
            }

            return new OwnedMethods(
                OwnedCompilerTypes: ownedCompilerTypes,
                OwnedLambdaMethods: ownedLambdaMethods,
                OwnedLocalFunctions: ownedLocalFunctions
            );
        }

        private static TypeDefinition? OwnStateMachineType(MethodData methodData)
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

        internal static IEnumerable<TypeDefinition> OwnCompilerTypes(MethodData methodData)
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

            var ownStateMachineType = OwnStateMachineType(methodData);
            if (ownStateMachineType != null)
            {
                result.Add(ownStateMachineType);
            }

            return result.Distinct();
        }

        private static IEnumerable<MethodDefinition> OwnMethodDefinitions(MethodData methodData) =>
            methodData.Argued.Concat(methodData.Called)
            // compiler-generated typed are necessarily in the same assembly
            .Where(mr => mr.DeclaringType.ReferencedAssemblyName() == methodData.MethodDefinition.AssemblyName())
            .Select(mr => mr.Resolve());

        internal static IEnumerable<MethodDefinition> OwnLamdaMethods(MethodData methodData) =>
            OwnMethodDefinitions(methodData)
            .Where(md => md.DeclaringType.IsLambdaCache())
            .ToList()
            .Distinct();

        internal static IEnumerable<MethodDefinition> OwnLocalFunctions(MethodData methodData) =>
            OwnMethodDefinitions(methodData)
            .Where(md => md.IsLocalFunction())
            .ToList()
            .Distinct();
    }
}
