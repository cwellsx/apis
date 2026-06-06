using Core.CecilToOutput;
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
        private record AssemblyTypeInfo(string AssemblyName, TypeInfo TypeInfo, string InAssemblyName);
        private record AssemblyMethodPair(string AssemblyName, TypeInfo DeclaringType, MethodMember MethodMember, string InAssemblyName);

        private record TypeNameParts(string Name, GenericParameterId[]? GenericParameters);

        readonly TwoDictionaries<TypeInfo> _allTypeInfos;
        readonly TwoDictionaries<MethodPair> _allMethodPairs;
        readonly AssemblyMap<TokenMaps> _allTokenMaps;

        internal delegate TokenMaps FetchTokenMapsDelegate(string assemblyName);
        internal FetchTokenMapsDelegate FetchTokenMaps { get; set; } = (assemblyName) => throw new Exception($"assemblyName: {assemblyName}");

        #region ctors

        internal AllNames(All all, IFetch? fetch = null)
        {
            _allTypeInfos = new TwoDictionaries<TypeInfo>(all, s_typeInfoConverter);
            _allMethodPairs = new TwoDictionaries<MethodPair>(all, s_methodPairConverter);
            _allTokenMaps = new AssemblyMap<TokenMaps>(all.Assemblies.Concat(all.MicrosoftAssemblies).ToDictionary(
                kvp => kvp.Key,
                kvp => new TokenMaps(kvp.Value.TypeSpecs, kvp.Value.MethodSpecs)
                ));

            if (fetch != null)
            {
                _allTypeInfos.Fetch = fetch.FetchTypeInfo;
                _allMethodPairs.Fetch = fetch.FetchMethodPair;
                FetchTokenMaps = fetch.FetchTokenMaps;
            }
        }

        private static Func<TypeInfo[], Dictionary<int, TypeInfo>> s_typeInfoConverter => typeInfos => typeInfos
            .ToDictionary(typeInfo => typeInfo.Id.LeafId.MetadataToken);

        private static Func<TypeInfo[], Dictionary<int, MethodPair>> s_methodPairConverter => typeInfos => typeInfos
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
                var tokenMaps = _allTokenMaps.ContainsKey(inAssemblyName) ? _allTokenMaps[inAssemblyName] : FetchTokenMaps(inAssemblyName);
                var typeSpec = tokenMaps.GetTypeSpec(specificationType.MetadataToken);
                if (typeSpec.Resolved.LeafId is GenericParameter genericParameter)
                {
                    Assert(typeSpec.GenericTypeArguments == null);
                    Assert(typeSpec.Suffix != null);
                    return genericParameter.ParameterName + typeSpec.Suffix;
                }

                return GetTypeName(GetAssemblyTypeInfo(typeSpec.Resolved.LeafId, inAssemblyName), typeSpec.GenericTypeArguments, typeSpec.Suffix);
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

        private string GetTypeName(AssemblyTypeInfo assemblyTypeInfo, TypeId[]? genericTypeArguments, string? suffix)
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

                var combinedGenericParameters = new List<GenericParameterId>();
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
                var tokenMaps = _allTokenMaps.ContainsKey(inAssemblyName) ? _allTokenMaps[inAssemblyName] : FetchTokenMaps(inAssemblyName);
                var methodSpecData = tokenMaps.GetMethodSpecData(genericMethod.MetadataToken);
                TypeId[]? genericTypeArguments = (methodSpecData.DeclaringType == null)
                    ? null
                    : tokenMaps.GetTypeSpec(((SpecificationType)methodSpecData.DeclaringType.LeafId).MetadataToken).GenericTypeArguments;
                return GetMethodName(GetAssemblyMethodPair(methodSpecData.Resolved.LeafId, inAssemblyName), genericTypeArguments, methodSpecData.GenericMethodArguments);
            }
            else
            {
                // this was an insufficient attampt to supply a dictionary to emulate Cecil's fullname of MethodSpecData
                // which was resolved instead by specifying Flatten.IgnoreSyntheticFullName

                //var assemblyMethodPair = GetAssemblyMethodPair(methodId, inAssemblyName);
                //Func<GenericParameterId, TypeId> toTypeId = parameter => new TypeId(parameter.FullName, parameter.LeafId);
                //return GetMethodName(
                //    assemblyMethodPair,
                //    assemblyMethodPair.DeclaringType.GenericParameters?.Select(toTypeId).ToArray(),
                //    assemblyMethodPair.MethodMember.GenericParameters?.Select(toTypeId).ToArray());

                return GetMethodName(GetAssemblyMethodPair(methodId, inAssemblyName), null, null);
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

        private (string, Dictionary<string, string>?) GetMethodName(AssemblyMethodPair assemblyMethodPair, TypeId[]? genericTypeArguments, TypeId[]? genericMethodArguments)
        {
            var (assemblyName, declaringType, methodMember, inAssemblyName) = assemblyMethodPair;

            var typeNameParts = GetTypeNameParts(declaringType, assemblyName);

            Dictionary<string, string>? genericParameterIndex = null;

            if (genericTypeArguments != null || genericMethodArguments != null)
            {
                genericParameterIndex = new Dictionary<string, string>(
                    GetGenericParameters(typeNameParts.GenericParameters, "!")
                    .Concat(GetGenericParameters(methodMember.GenericParameters, "!!"))
                    );
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
            GenericParameterId[]? genericParameters,
            string prefix
            )
        {
            if (genericParameters == null)
            {
                return [];
            }
            return genericParameters.Select((parameter, index) => new KeyValuePair<string, string>($"{prefix}{index}", parameter.LeafId.ParameterName));
        }

        private string GetGenericTypeArguments(TypeId[]? genericTypeArguments, string inAssemblyName)
        {
            return (genericTypeArguments == null)
                ? ""
                : $"<{string.Join(",", genericTypeArguments.Select(arg => GetTypeName(arg.LeafId, inAssemblyName)))}>";
        }
    }
}
