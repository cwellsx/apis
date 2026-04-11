using Core.Output;
using Core.ShortNames;
using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;

namespace Core.Names
{
    internal class AllNames : INames
    {
        readonly Dictionary<string, Dictionary<int, TypeInfo>> _assembliesTypeInfo;
        readonly Dictionary<string, Dictionary<int, TypeInfo>> _microsoftTypeInfo;

        internal AllNames(All all)
        {
            _assembliesTypeInfo = ToTypInfoDictionary(all.Assemblies);
            _microsoftTypeInfo = ToTypInfoDictionary(all.MicrosoftAssemblies);
        }

        public string GetTypeName(object shortId, string? inAssemblyName) => GetTypeName(Factory.FromShortName(shortId), inAssemblyName, withArguments: false);

        public string GetTypeName(IShortName shortName, string? inAssemblyName, bool withArguments) => shortName switch
        {
            FunctionShortName functionShortName => functionShortName.FunctionName,
            SpecificationShortName specificationShortName => GetSpecificationTypeName(specificationShortName, inAssemblyName),
            _ => GetBaseTypeNameParts((IBaseShortName)shortName, inAssemblyName).AsName(withArguments)
        };

        private TypeNameParts GetBaseTypeNameParts(IBaseShortName baseShortName, string? inAssemblyName) => baseShortName switch
        {
            LocalShortName localShortNeme => GetTypeNameParts(inAssemblyName ?? throw new ArgumentNullException(), localShortNeme.MetadataToken),
            RemoteShortName remoteShortNeme => GetTypeNameParts(remoteShortNeme.AssemblyName, remoteShortNeme.MetadataToken),
            GenericParameterShortName genericParameterShortName => new TypeNameParts(genericParameterShortName.ParameterName, null),
            _ => throw new NotSupportedException($"baseShortName: {baseShortName}")
        };

        private string GetSpecificationTypeName(SpecificationShortName specificationShortName, string? inAssemblyName)
        {
            var typeNameParts = GetBaseTypeNameParts(specificationShortName.Resolved, inAssemblyName);
            var genericTypeArguments = specificationShortName.GenericTypeArguments?.Select(arg => GetTypeName(arg, inAssemblyName, withArguments: true)).ToArrayOrNull();
            if (typeNameParts.GenericTypeParameters == null)
            {
                if (genericTypeArguments != null)
                {
                    throw new System.Exception();
                }
            }
            else
            {
                if (genericTypeArguments == null)
                {
                    throw new System.Exception();
                }
                if (typeNameParts.GenericTypeParameters.Length != genericTypeArguments.Length)
                {
                    throw new System.Exception();
                }
                typeNameParts = new TypeNameParts(typeNameParts.TypeName, genericTypeArguments);
            }
            return typeNameParts.AsName(true) + specificationShortName.Suffix;
        }

        private TypeNameParts GetTypeNameParts(string assemblyName, int metadataToken)
        {
            var typeInfo = GetTypeInfo(assemblyName, metadataToken);

            var typeName = typeInfo.DeclaringType != null
                ? $"{GetTypeName(typeInfo.DeclaringType.SerializeAs, assemblyName)}/{typeInfo.Name}"
                : typeInfo.Namespace != null
                ? $"{typeInfo.Namespace}.{typeInfo.Name}"
                : typeInfo.Name;

            return new TypeNameParts(typeName, typeInfo.GenericTypeParameters);
        }

        private TypeInfo GetTypeInfo(string assemblyName, int metadataToken)
        {
            TypeInfo? typeInfo;
            if (TryGetValue(_assembliesTypeInfo, assemblyName, metadataToken, out typeInfo))
            {
                return typeInfo;
            }
            if (TryGetValue(_microsoftTypeInfo, assemblyName, metadataToken, out typeInfo))
            {
                return typeInfo;
            }

            typeInfo = FetchTypeInfo(assemblyName, metadataToken);
            Add(_microsoftTypeInfo, assemblyName, metadataToken, typeInfo);

            return typeInfo;
        }

        private static bool TryGetValue<T>(Dictionary<string, Dictionary<int, T>> dictionary, string assemblyName, int metadataToken, [MaybeNullWhen(false)] out T value)
        {
            value = default;
            if (!dictionary.TryGetValue(assemblyName, out var inner))
            {
                return false;
            }
            return inner.TryGetValue(metadataToken, out value);
        }

        private static void Add<T>(Dictionary<string, Dictionary<int, T>> dictionary, string assemblyName, int metadataToken, T value)
        {
            if (!dictionary.TryGetValue(assemblyName, out var inner))
            {
                inner = new Dictionary<int, T>();
                dictionary.Add(assemblyName, inner);
            }
            inner.Add(metadataToken, value);
        }

        protected virtual TypeInfo FetchTypeInfo(string assemblyName, int metadataToken) => throw new System.Exception($"assemblyName: {assemblyName}, metadataToken: {metadataToken}");

        private static Dictionary<string, Dictionary<int, TypeInfo>> ToTypInfoDictionary(Dictionary<string, AssemblyInfo> assemblies) => assemblies.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.TypeInfos.ToDictionary(
                typeInfo => typeInfo.Id.GetMetadataToken()
            ));
    }
}
