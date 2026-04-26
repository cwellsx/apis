using Core.Id;
using Core.Id.Methods;
using Core.Id.Types;
using Core.Output;
using Core.Output.Ids;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.FullNames
{
    internal class AllNames : INames
    {
        protected record MethodPair(MethodMember MethodMember, TypeInfo DeclaringType);

        private record AssemblyTypeInfo(string AssemblyName, TypeInfo TypeInfo, string InAssemblyName);
        private record AssemblyMethodPair(string AssemblyName, TypeInfo DeclaringType, MethodMember MethodMember, string InAssemblyName);

        private record TypeNameParts(string Name, string[]? GenericParameters);

        readonly TwoDictionaries<TypeInfo> _allTypeInfos;
        readonly TwoDictionaries<MethodPair> _allMethodPairs;

        #region ctors

        internal AllNames(All all)
        {
            _allTypeInfos = new TwoDictionaries<TypeInfo>(all, s_typeInfoConverter);
            _allMethodPairs = new TwoDictionaries<MethodPair>(all, s_methodPairConverter);
        }

        protected AllNames(TwoDictionaries<TypeInfo> allTypeInfos, TwoDictionaries<MethodPair> allMethodPairs)
        {
            _allTypeInfos = allTypeInfos;
            _allMethodPairs = allMethodPairs;
        }

        protected static Func<TypeInfo[], Dictionary<int, TypeInfo>> s_typeInfoConverter => typeInfos => typeInfos
            .ToDictionary(typeInfo => typeInfo.Id.LeafId.MetadataToken);

        protected static Func<TypeInfo[], Dictionary<int, MethodPair>> s_methodPairConverter => typeInfos => typeInfos
            .SelectMany(
                typeInfo => typeInfo.MethodMembers ?? [],
                (typeInfo, methodMember) => new MethodPair(methodMember, typeInfo)
                )
            .ToDictionary(methodPair => methodPair.MethodMember.MetadataToken);

        #endregion

        public string GetTypeName(object shortId, string inAssemblyName) => GetTypeName(TypeFactory.FromShortName(shortId), inAssemblyName);

        public (string, Dictionary<string, string>?) GetMethodName(object shortId, string inAssemblyName) => GetMethodName(MethodFactory.FromShortName(shortId), inAssemblyName);

        private string GetTypeName(ITypeId typeId, string inAssemblyName)
        {
            // two special cases, with names encoded in the shortId, return immediately and don't try to find the TypeInfo
            switch (typeId)
            {
                case FunctionType functionType:
                    return functionType.FunctionName;
                case GenericParameter genericParameter:
                    return genericParameter.ParameterName;
            }

            if (typeId is SpecificationType specificationType)
            {
                if (specificationType.Resolved is GenericParameter genericParameter)
                {
                    Assert(specificationType.GenericTypeArguments == null);
                    Assert(specificationType.Suffix != null);
                    return genericParameter.ParameterName + specificationType.Suffix;
                }

                return GetTypeName(GetAssemblyTypeInfo(specificationType.Resolved, inAssemblyName), specificationType.GenericTypeArguments, specificationType.Suffix);
            }
            else
            {
                return GetTypeName(GetAssemblyTypeInfo(typeId, inAssemblyName), null, null);
            }
        }

        private AssemblyTypeInfo GetAssemblyTypeInfo(ITypeId typeId, string inAssemblyName)
        {
            var (assemblyName, metadataToken) = typeId switch
            {
                LocalType localType => (inAssemblyName, localType.MetadataToken),
                RemoteType remoteType => (remoteType.AssemblyName, remoteType.MetadataToken),
                _ => throw new NotSupportedException($"typeId: {typeId}")
            };
            var typeInfo = _allTypeInfos.Get(assemblyName, metadataToken);
            return new AssemblyTypeInfo(assemblyName, typeInfo, inAssemblyName);
        }

        private string GetTypeName(AssemblyTypeInfo assemblyTypeInfo, ITypeId[]? genericTypeArguments, string? suffix)
        {
            var (assemblyName, typeInfo, inAssemblyName) = assemblyTypeInfo;
            var typeName = GetTypeNameParts(typeInfo, assemblyName).Name;
            var genericArguments = GetGenericTypeArguments(genericTypeArguments, inAssemblyName);
            return typeName + genericArguments + suffix;
        }

        private TypeNameParts GetTypeNameParts(TypeInfo typeInfo, string assemblyName)
        {
            if (typeInfo.DeclaringType != null)
            {
                var declaringTypeInfo = _allTypeInfos.Get(assemblyName, typeInfo.DeclaringType.LeafId.MetadataToken);
                var declaringTypeNameParts = GetTypeNameParts(declaringTypeInfo, assemblyName);

                var combinedTypeName = $"{declaringTypeNameParts.Name}/{typeInfo.Name}";

                var combinedGenericParameters = new List<string>();
                if (declaringTypeNameParts.GenericParameters != null)
                {
                    combinedGenericParameters.AddRange(declaringTypeNameParts.GenericParameters);
                }
                if (typeInfo.GenericParameters != null)
                {
                    // nested type inherit parameter names => don't add those inherited names again
                    combinedGenericParameters.AddRange(typeInfo.GenericParameters.Where(name => !combinedGenericParameters.ToArray().Contains(name)));
                }

                return new TypeNameParts(combinedTypeName, combinedGenericParameters.ToArrayOrNull());
            }

            var typeName = typeInfo.Namespace != null ? $"{typeInfo.Namespace}.{typeInfo.Name}" : typeInfo.Name;

            return new TypeNameParts(typeName, typeInfo.GenericParameters);
        }

        private (string, Dictionary<string, string>?) GetMethodName(IMethodId methodId, string inAssemblyName)
        {
            if (methodId is GenericMethod genericMethod)
            {
                return GetMethodName(GetAssemblyMethodPair(genericMethod.Resolved, inAssemblyName), genericMethod.GenericTypeArguments);
            }
            else
            {
                return GetMethodName(GetAssemblyMethodPair(methodId, inAssemblyName), null);
            }
        }

        private AssemblyMethodPair GetAssemblyMethodPair(IMethodId methodId, string inAssemblyName)
        {
            var (assemblyName, metadataToken) = methodId switch
            {
                LocalMethod localMethod => (inAssemblyName, localMethod.MetadataToken),
                RemoteMethod remoteMethod => (remoteMethod.AssemblyName, remoteMethod.MetadataToken),
                _ => throw new NotSupportedException($"methodId: {methodId}")
            };
            var methodPair = _allMethodPairs.Get(assemblyName, metadataToken);
            return new AssemblyMethodPair(assemblyName, methodPair.DeclaringType, methodPair.MethodMember, inAssemblyName);
        }

        private (string, Dictionary<string, string>?) GetMethodName(AssemblyMethodPair assemblyMethodPair, ITypeId[]? genericTypeArguments)
        {
            var (assemblyName, declaringType, methodMember, inAssemblyName) = assemblyMethodPair;

            var typeNameParts = GetTypeNameParts(declaringType, assemblyName);

            Dictionary<string, string>? genericParameterIndex = null;

            ITypeId[]? genericMethodArguments = null;
            if (genericTypeArguments != null)
            {
                var countTotal = genericTypeArguments.Length;

                var countTypeArguments = typeNameParts.GenericParameters?.Length ?? 0;
                genericMethodArguments = genericTypeArguments.Skip(countTypeArguments).ToArrayOrNull();
                genericTypeArguments = genericTypeArguments.Take(countTypeArguments).ToArrayOrNull();

                genericParameterIndex = new Dictionary<string, string>(
                    GetGenericParameters(typeNameParts.GenericParameters, "!")
                    .Concat(GetGenericParameters(methodMember.GenericParameters, "!!"))
                    );

                Assert((countTotal) == genericParameterIndex.Count);
            }

            string GetTypeIdName(TypeId typeId)
            {
                var leafId = typeId.LeafId;
                return GetTypeName(typeId.LeafId, assemblyName);
            }

            var returnTypeName = GetTypeIdName(methodMember.ReturnType);

            var parameterTypeNames = string.Join(",", methodMember.Parameters?.Select(parameter => GetTypeIdName(parameter.Type)) ?? []);

            var genericTypeArgumentNames = GetGenericTypeArguments(genericTypeArguments, inAssemblyName);
            var genericMethodArgumentNames = GetGenericTypeArguments(genericMethodArguments, inAssemblyName);

            return (
                $"{returnTypeName} {typeNameParts.Name}{genericTypeArgumentNames}::{methodMember.Name}{genericMethodArgumentNames}({parameterTypeNames})",
                genericParameterIndex
                );
        }

        private static IEnumerable<KeyValuePair<string, string>> GetGenericParameters(
            string[]? genericParameters,
            string prefix
            )
        {
            if (genericParameters == null)
            {
                return [];
            }
            return genericParameters.Select((parameter, index) => new KeyValuePair<string, string>($"{prefix}{index}", parameter));
        }

        private string GetGenericTypeArguments(ITypeId[]? genericTypeArguments, string inAssemblyName)
        {
            return (genericTypeArguments == null)
                ? ""
                : $"<{string.Join(",", genericTypeArguments.Select(arg => GetTypeName(arg, inAssemblyName)))}>";
        }
    }
}
