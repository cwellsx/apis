using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;

namespace Core.Output
{
    internal class NameFromId : INameFromId
    {
        readonly Dictionary<string, Dictionary<int, TypeInfo>> _assembliesTypeInfo;
        readonly Dictionary<string, Dictionary<int, TypeInfo>> _microsoftTypeInfo;

        internal NameFromId(All all)
        {
            _assembliesTypeInfo = ToTypInfoDictionary(all.Assemblies);
            _microsoftTypeInfo = ToTypInfoDictionary(all.MicrosoftAssemblies);
        }

        public TypeNameParts GetTypeNameParts(string assemblyName, int metadataToken)
        {
            var typeInfo = GetTypeInfo(assemblyName, metadataToken);
            return GetTypeDefName(typeInfo);
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

        private TypeNameParts GetTypeDefName(TypeInfo typeInfo)
        {
            var typeName = typeInfo.DeclaringType != null
                ? $"{typeInfo.DeclaringType.GetName(this)}/{typeInfo.Name}"
                : typeInfo.Namespace != null
                ? $"{typeInfo.Namespace}.{typeInfo.Name}"
                : typeInfo.Name;

            return new TypeNameParts(typeName, typeInfo.GenericTypeParameters);
        }

        private static Dictionary<string, Dictionary<int, TypeInfo>> ToTypInfoDictionary(Dictionary<string, AssemblyInfo> assemblies) => assemblies.ToDictionary(
            kvp => kvp.Key,
            kvp => kvp.Value.TypeInfos.ToDictionary(
                typeInfo => typeInfo.Id.GetMetadataToken()
            ));
    }
}
