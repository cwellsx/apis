using Core.Output;
using Core.Serializer;
using System.Collections.Generic;
using System.Linq;

namespace Core
{
    internal class NameFromId : INameFromId
    {
        Dictionary<string, Dictionary<int, TypeDefInfo>> _maps;
        HashSet<string> _microsoftAssemblyNames;

        internal NameFromId(All all)
        {
            _maps = all.Assemblies.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.TypeDefinitions.ToDictionary(
                    typeDefInfo => typeDefInfo.Id.MetadataToken
                ));

            _microsoftAssemblyNames = all.MicrosoftAssemblyNames.ToHashSet();
        }

        public TypeDefName GetTypeDefName(string assemblyName, int metadataToken)
        {
            var typeDefInfo = _maps[assemblyName][metadataToken];
            return GetTypeDefName(typeDefInfo);
        }

        public bool IsMicrosoftAssemblyName(string assemblyName) => _microsoftAssemblyNames.Contains(assemblyName);

        private TypeDefName GetTypeDefName(TypeDefInfo typeDefInfo)
        {
            var typeName = typeDefInfo.DeclaringType != null
                ? $"{typeDefInfo.DeclaringType.GetName(this)}/{typeDefInfo.Name}"
                : typeDefInfo.Namespace != null
                ? $"{typeDefInfo.Namespace}.{typeDefInfo.Name}"
                : typeDefInfo.Name;

            return new TypeDefName(typeName, typeDefInfo.GenericTypeParameters);
        }
    }
}
