using Mono.Cecil;
using Mono.Cecil.Cil;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace Core.Cecil
{
    internal static class Transform
    {
        internal interface IFilter
        {
            bool IsMicrosoftAssemblyName(string assemblyName);
            bool IsMicrosoftAssemblyPath(string assemblyName);
        }

        internal static void ValidateTypes(Output.Public.TypeInfo[] typeInfos, TypeDefinition[] typeDefinitions)
        {
            if (typeInfos.Length != typeDefinitions.Length)
            {
                throw new Exception($"Type count mismatch: {typeInfos.Length} != {typeDefinitions.Length}");
            }

            var typeInfoIds = typeInfos.Select(typeInfo => typeInfo.TypeId.MetadataToken).ToHashSet();
            var typeDefinitionIds = typeDefinitions.Select(typeDefinition => typeDefinition.MetadataToken.ToInt32()).ToHashSet();

            if (!typeInfoIds.SetEquals(typeDefinitionIds))
            {
                throw new Exception("Type metadata token mismatch");
            }

            Logger.Log($"Types: {typeInfos.Length}");
        }

        internal static void ToCompilerMethods(AssemblyData assemblyData)
        {
            var resolvedTypes = assemblyData.MethodData
                // we want to know whose calling which methods of the <>c class
                // it's not really a static class, it's a singleton with a static constructor
                .Where(methodData => !methodData.IsLambdaCacheStaticCtor)
                .SelectMany(methodData => methodData.CompilerGeneratedTypes
                .Select(typeDefinition => (methodData, typeDefinition))
                ).ToArray();

            var resolvedTypeIds = new HashSet<MetadataToken>(resolvedTypes.Select(t => t.typeDefinition.MetadataToken));

            var unresolvedTypes = assemblyData.TypeDefinitions
                .Where(IsCompilerGenerated)
                .Where(IsSignificantCompilerGenerated)
                .Where(typeDefinition => !resolvedTypeIds.Contains(typeDefinition.MetadataToken));

            if (!unresolvedTypes.All(IsLambdaCache))
            {
                throw new Exception("Some compiler-generated types were not resolved");
            }

            var compilerMethods = unresolvedTypes
                .SelectMany(typeDefinition => typeDefinition.Methods)
                .Where(methodDefinition => !methodDefinition.IsConstructor)
                .ToArray();

            var compilerMethodsIds = new HashSet<MetadataToken>(compilerMethods.Select(methodDefinition => methodDefinition.MetadataToken));

            if (compilerMethods.Length != compilerMethodsIds.Count)
            {
                throw new Exception("Compiler methods are not distinct");
            }

            var resolvedMethods = assemblyData.MethodData
                // we want to know whose calling which methods of the <>c class
                // it's not really a static class, it's a singleton with a static constructor
                .Where(methodData => !methodData.IsLambdaCacheStaticCtor)
                .SelectMany(ownerMethodData => ownerMethodData.CompilerGeneratedMethods
                .Select(compilerMethodDefinition => (ownerMethodData, compilerMethodDefinition))
                ).ToArray();

            var resolvedMethodIds = new HashSet<MetadataToken>(resolvedMethods.Select(t => t.compilerMethodDefinition.MetadataToken));

            if (!compilerMethodsIds.SetEquals(resolvedMethodIds))
            {
                throw new Exception("Some compiler-generated methods were not resolved");
            }

            /*
             * There are two problems to resolve:
             * - A type might be constructed from a user method and from a compiler-generated method
             * - A type might be constructed only from a compiler-generated method
             * In both cases we want to know which user method owns the compiler-generated method.
             * Do it in two stages: first resolve each type; then verify that any duplicates agree.
             */

            // key is compiler type, value is the user method which owns it
            var map = new Dictionary<MetadataToken, MetadataToken>();
            foreach (var (methodData, typeDefinition) in resolvedTypes)
            {
                if (!methodData.DeclaringType.IsCompilerGenerated())
                {
                    map.Add(typeDefinition.MetadataToken, methodData.MetadataToken);
                }
                if (resolvedMethodIds.Contains(methodData.MetadataToken))
                {
                    var ownerMethodData = resolvedMethods.Single(t => t.compilerMethodDefinition.MetadataToken == methodData.MetadataToken).ownerMethodData;
                    if (ownerMethodData.DeclaringType.IsCompilerGenerated())
                    {
                        throw new Exception();
                    }
                    map.Add(typeDefinition.MetadataToken, ownerMethodData.MetadataToken);
                }
            }

            bool tryNeeded;
            bool tryUseful;
            do
            {
                tryNeeded = false;
                tryUseful = false;
                var generation = new Dictionary<MetadataToken, MetadataToken>();
                foreach (var (methodData, typeDefinition) in resolvedTypes)
                {
                    if (map.ContainsKey(typeDefinition.MetadataToken))
                    {
                        continue;
                    }

                    var declaringType = methodData.DeclaringType;
                    if (!declaringType.IsCompilerGenerated())
                    {
                        throw new Exception();
                    }

                    if (map.ContainsKey(declaringType.MetadataToken))
                    {
                        var userMethodId = map[declaringType.MetadataToken];
                        map.Add(typeDefinition.MetadataToken, userMethodId);
                        tryUseful = true;
                    }
                    else
                    {
                        tryNeeded = true;
                    }
                }

            } while (tryNeeded && tryUseful);

            var methodDataDictionary = assemblyData.MethodData.ToDictionary(methodData => methodData.MetadataToken);
            Func<TypeDefinition, MethodData?> getOwner = (typeDefinition) => map.TryGetValue(typeDefinition.MetadataToken, out var ownerMetadataToken)
            ? methodDataDictionary[ownerMetadataToken]
            : null;

            var result = resolvedTypes.Select(pair => (pair.typeDefinition, pair.methodData, owner: getOwner(pair.typeDefinition)))
            .Select(tuple => (
            tuple.typeDefinition.FullName,
            tuple.methodData.Name,
            tuple.methodData.DeclaringType.FullName,
            tuple.owner?.Name,
            tuple.owner?.DeclaringType.FullName
            )).ToArray();

            Array.Sort(result);

            Logger.Log($@"Compiler-generated methods and their owners:
{string.Join("\r\n", result)}");

            if (tryNeeded)
            {
                throw new Exception();
            }
        }

        // this is the only compiler-generated type that isn't wholly-owned by a single user methods
        // instead each of its methods is owned by various user methods
        //internal static bool IsLambdaCache(this TypeDefinition typeDefinition) => typeDefinition.Name == "<>c";
        private static readonly Regex LambdaCachePattern = new(@"^<>c(__\d+)?(`\d+)?$", RegexOptions.Compiled);
        internal static bool IsLambdaCache(this TypeReference typeReference) => LambdaCachePattern.IsMatch(typeReference.Name);

        internal static bool IsCompilerGenerated(this TypeDefinition typeDefinition) =>
            typeDefinition.CustomAttributes.Any(ca => ca.AttributeType.FullName == "System.Runtime.CompilerServices.CompilerGeneratedAttribute");

        internal static bool IsSignificantCompilerGenerated(this TypeDefinition typeDefinition) =>
            // maybe some types like Foo/<>O which have no methods and aren't used at runtime
            typeDefinition.HasMethods &&
            // ignore e.g. "Microsoft.CodeAnalysis.EmbeddedAttribute
            typeDefinition.BaseType.FullName != "System.Attribute" &&
            !typeDefinition.FullName.StartsWith("<PrivateImplementationDetails>");

        internal static Output.Public.MethodInfo ToMethodInfo(MethodData methodData, IFilter filter)
        {
            return new Output.Public.MethodInfo(
                AsText: "foo",
                Called: ToMethodCall(methodData.Called, filter),
                Argued: ToMethodCall(methodData.Argued, filter),
                Locals: ToLocalsType(methodData.Locals.Where(IsSimple), filter)
                );
        }

        private static bool IsSimple(VariableReference variableReference) => IsSimple(variableReference.VariableType);

        private static bool IsSimple(TypeReference typeReference) =>
            !typeReference.IsArray &&
            !typeReference.IsByReference &&
            !typeReference.IsPointer &&
            !typeReference.IsPinned &&
            !typeReference.IsGenericInstance &&
            !typeReference.IsGenericParameter &&
            !typeReference.IsFunctionPointer &&
            !typeReference.IsPrimitive;

        private static Output.Public.MethodCall[]? ToMethodCall(IEnumerable<MethodReference> methodReferences, IFilter filter)
        {
            return methodReferences
                .Where(methodReference => !filter.IsMicrosoftAssemblyName(methodReference.DeclaringType.Scope.Name)) // don't know the Module yet
                .Select(ToMethodCall)
                .Where(methodCall => !filter.IsMicrosoftAssemblyPath(methodCall.AssemblyName))
                .ToArray();
        }

        private static Output.Public.LocalsType[]? ToLocalsType(IEnumerable<VariableReference> variableReferences, IFilter filter)
        {
            return variableReferences
                .Where(variableReference => !filter.IsMicrosoftAssemblyName(variableReference.VariableType.Scope.Name)) // don't know the Module yet
                .Select(ToLocalsType)
                .Where(localsType => !filter.IsMicrosoftAssemblyPath(localsType.AssemblyName))
                .Distinct()
                .ToArray();
        }

        private static Output.Public.MethodCall ToMethodCall(MethodReference methodReference)
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

        private static Output.Public.LocalsType ToLocalsType(VariableReference variableReference)
        {
            try
            {
                var variableDefinition = variableReference.Resolve();
                // TODO there's so
                if (0 == (variableDefinition.VariableType.MetadataToken.ToInt32() & 0xFFFFFF))
                {
                    var scope = variableReference.VariableType.Scope as AssemblyNameReference;
                    //var resolvedAssembly = _assemblyResolver.Resolve(scope!);
                    throw new ArgumentException("nil token");
                }
                return new Output.Public.LocalsType(
                    AssemblyName: variableDefinition.VariableType.Module.Assembly.Name.Name,
                    MetadataToken: variableDefinition.VariableType.MetadataToken.ToInt32()
                    );
            }
            catch (Exception)
            {
                Logger.Log($"Failed to resolve variable {variableReference}");
                var scope = variableReference.VariableType.Scope;
                return new Output.Public.LocalsType(
                    AssemblyName: scope.Name,
                    MetadataToken: null //methodReference.MetadataToken.ToInt32(),
                    );
            }
        }
    }
}
