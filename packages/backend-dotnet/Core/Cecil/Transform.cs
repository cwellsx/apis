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

        internal static Dictionary<int, int> ToCompilerMethods(AssemblyData assemblyData)
        {
            // compiler types which are referenced via Newobj in methods
            var resolvedTypes = assemblyData.MethodData
                // exclude the <>c class which is not really a static class, it's a singleton with a static constructor
                .Where(methodData => !methodData.IsLambdaCacheStaticCtor)
                .SelectMany(methodData => methodData.CompilerGeneratedTypes
                .Select(typeDefinition => (methodData, typeDefinition))
                ).ToArray();

            // assert that resolvedTypes includes all compiler-generated types except the <>c class
            var resolvedTypeIds = new HashSet<MetadataToken>(resolvedTypes.Select(t => t.typeDefinition.MetadataToken));
            var allCompilerTypes = assemblyData.TypeDefinitions.Where(IsSignificantCompilerGenerated).ToArray();
            if (allCompilerTypes.Any(typeDefinition => !resolvedTypeIds.Contains(typeDefinition.MetadataToken) && !typeDefinition.IsLambdaCache()))
            {
                throw new Exception("Some compiler-generated types were not resolved");
            }

            var resolvedMethods = assemblyData.MethodData
                // we want to know whose calling which methods of the <>c class
                // it's not really a static class, it's a singleton with a static constructor
                .Where(methodData => !methodData.IsLambdaCacheStaticCtor)
                .SelectMany(ownerMethodData => ownerMethodData.CompilerGeneratedMethods
                .Select(compilerMethodDefinition => (ownerMethodData, compilerMethodDefinition))
                ).ToArray();

            // assert that resolvedMethods includes all compiler-generated methods of the <>c class
            var allCompilerMethodIds = allCompilerTypes
                .Where(IsLambdaCache)
                .SelectMany(typeDefinition => typeDefinition.Methods)
                .Where(methodDefinition => !methodDefinition.IsConstructor)
                .Select(methodDefinition => methodDefinition.MetadataToken)
                .ToHashSet();
            var resolvedMethodIds = new HashSet<MetadataToken>(resolvedMethods.Select(t => t.compilerMethodDefinition.MetadataToken));
            if (!resolvedMethodIds.SetEquals(allCompilerMethodIds))
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
            var mapMethods = resolvedMethods.ToDictionary(
                pair => pair.compilerMethodDefinition.MetadataToken,
                pair => pair.ownerMethodData
                );

            // key is compiler type, value is the user method which owns it
            var mapTypes = new Dictionary<MetadataToken, MethodData>();

            foreach (var (methodData, typeDefinition) in resolvedTypes)
            {
                if (!methodData.DeclaringType.IsCompilerGenerated())
                {
                    mapTypes.Add(typeDefinition.MetadataToken, methodData);
                }
                if (mapMethods.TryGetValue(methodData.MetadataToken, out var ownerMethodData))
                {
                    if (ownerMethodData.DeclaringType.IsCompilerGenerated())
                    {
                        throw new Exception();
                    }
                    mapTypes.Add(typeDefinition.MetadataToken, ownerMethodData);
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
                    if (mapTypes.ContainsKey(typeDefinition.MetadataToken))
                    {
                        continue;
                    }

                    var declaringType = methodData.DeclaringType;
                    if (!declaringType.IsCompilerGenerated())
                    {
                        throw new Exception();
                    }

                    if (mapTypes.ContainsKey(declaringType.MetadataToken))
                    {
                        var userMethodId = mapTypes[declaringType.MetadataToken];
                        mapTypes.Add(typeDefinition.MetadataToken, userMethodId);
                        tryUseful = true;
                    }
                    else
                    {
                        tryNeeded = true;
                    }
                }

            } while (tryNeeded && tryUseful);

            MethodData GetTypeOwner(TypeDefinition typeDefinition)
            {
                if (mapTypes.TryGetValue(typeDefinition.MetadataToken, out var ownerMetadata))
                {
                    return ownerMetadata;
                }
                throw new Exception();
            }

            MethodData GetMethodOwner(MethodData methodData)
            {
                TypeDefinition typeDefinition = methodData.DeclaringType;
                if (!typeDefinition.IsCompilerGenerated())
                {
                    return methodData;
                }
                if (typeDefinition.IsLambdaCache())
                {
                    if (mapMethods.TryGetValue(methodData.MetadataToken, out var ownerMethodData))
                    {
                        return ownerMethodData;
                    }
                    throw new Exception();
                }
                return GetTypeOwner(typeDefinition);
            }

            var showTypes = resolvedTypes.Select(pair => (pair.typeDefinition, pair.methodData, owner: GetTypeOwner(pair.typeDefinition)))
            .Select(tuple => (
            tuple.typeDefinition.FullName,
            tuple.methodData.Name,
            tuple.methodData.DeclaringType.FullName,
            tuple.owner?.Name,
            tuple.owner?.DeclaringType.FullName
            )).ToArray();

            Array.Sort(showTypes);

            Logger.Log($@"Compiler-generated types and their owners:
{string.Join("\r\n", showTypes)}");

            var showMethods = resolvedMethods.Select(pair => (
            pair.compilerMethodDefinition,
            pair.ownerMethodData,
            owner: GetMethodOwner(pair.ownerMethodData)
            )).Select(tuple => (
            tuple.compilerMethodDefinition.DeclaringType.FullName,
            tuple.compilerMethodDefinition.Name,
            tuple.ownerMethodData.DeclaringType.FullName,
            tuple.ownerMethodData.Name,
            tuple.owner == tuple.ownerMethodData ? "-" : tuple.owner?.DeclaringType.FullName,
            tuple.owner == tuple.ownerMethodData ? "-" : tuple.owner?.Name
            )).ToArray();

            Array.Sort(showMethods);

            Logger.Log($@"Compiler-generated methods and their owners:
{string.Join("\r\n", showMethods)}");

            if (tryNeeded)
            {
                throw new Exception();
            }

            var result = new Dictionary<int, int>();

            void AddResult(MethodDefinition compilerMethodDefinition, MethodData ownerMethodData)
            {
                if (!compilerMethodDefinition.DeclaringType.IsCompilerGenerated())
                {
                    throw new Exception();
                }
                if (ownerMethodData.DeclaringType.IsCompilerGenerated())
                {
                    throw new Exception();
                }
                result.Add(compilerMethodDefinition.MetadataToken.ToInt32(), ownerMethodData.MetadataToken.ToInt32());
            }

            var added = new HashSet<MetadataToken>();

            foreach (var typeDefinition in resolvedTypes.Select(pair => pair.typeDefinition))
            {
                // the same class can be called from more than one method, e.g. from a user method and from a compiler-generated method
                if (!added.Add(typeDefinition.MetadataToken))
                {
                    continue;
                }
                var owner = GetTypeOwner(typeDefinition);
                foreach (var methodDefinition in typeDefinition.Methods.Where(methodDefinition => !methodDefinition.IsConstructor()))
                {
                    AddResult(methodDefinition, owner);
                }
            }

            foreach (var (ownerMethodData, compilerMethodDefinition) in resolvedMethods)
            {
                var owner = GetMethodOwner(ownerMethodData);
                AddResult(compilerMethodDefinition, owner);
            }

            return result;

            //foreach (var method in resolvedTypes.SelectMany(pair => pair.typeDefinition.Methods).Where(methodDefinition => !methodDefinition.isConstructor())
            //{
            //    var ownerMethodData = GetTypeOwner(method.DeclaringType);
            //    result.Add(method.MetadataToken.ToInt32(), ownerMethodData.MetadataToken.ToInt32());
            //}
        }

        // this is the only compiler-generated type that isn't wholly-owned by a single user methods
        // instead each of its methods is owned by various user methods
        //internal static bool IsLambdaCache(this TypeDefinition typeDefinition) => typeDefinition.Name == "<>c";
        private static readonly Regex LambdaCachePattern = new(@"^<>c(__\d+)?(`\d+)?$", RegexOptions.Compiled);
        internal static bool IsLambdaCache(this TypeReference typeReference) => LambdaCachePattern.IsMatch(typeReference.Name);

        internal static bool IsCompilerGenerated(this TypeDefinition typeDefinition) =>
            // most compiler-generated types have this attribute
            typeDefinition.CustomAttributes.Any(ca => ca.AttributeType.FullName == "System.Runtime.CompilerServices.CompilerGeneratedAttribute") ||
            // nested types might be compiler-generated even if the attribute is on the parent type
            (typeDefinition.DeclaringType != null && IsCompilerGenerated(typeDefinition.DeclaringType)) ||
            // maybe the IteratorInsideLocalExample example needs this
            typeDefinition.Name.StartsWith("<");

        internal static bool IsSignificantCompilerGenerated(this TypeDefinition typeDefinition) =>
            typeDefinition.IsCompilerGenerated() &&
            // maybe some types like Foo/<>O which have no methods and aren't used at runtime
            typeDefinition.HasMethods &&
            // ignore e.g. "Microsoft.CodeAnalysis.EmbeddedAttribute
            typeDefinition.BaseType.FullName != "System.Attribute" &&
            !typeDefinition.FullName.StartsWith("<PrivateImplementationDetails>");

        internal static bool IsConstructor(this MethodDefinition methodDefinition) => methodDefinition.Name == ".ctor" || methodDefinition.Name == ".cctor";

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
