using System.Collections.Generic;
using System.Linq;

namespace Core.Output
{
    internal class NameFromId : INameFromId
    {
        Dictionary<string, Dictionary<int, TypeInfo>> _maps;
        HashSet<string> _microsoftAssemblyNames;

        internal NameFromId(All all)
        {
            _maps = all.Assemblies.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.TypeInfos.ToDictionary(
                    typeDefInfo => typeDefInfo.Id.GetMetadataToken()
                ));

            _microsoftAssemblyNames = all.MicrosoftAssemblyNames.ToHashSet();
        }

        public TypeNameParts GetTypeNameParts(string assemblyName, int metadataToken)
        {
            var typeDefInfo = _maps[assemblyName][metadataToken];
            return GetTypeDefName(typeDefInfo);
        }

        public bool IsMicrosoftAssemblyName(string assemblyName) => _microsoftAssemblyNames.Contains(assemblyName);

        private TypeNameParts GetTypeDefName(TypeInfo typeDefInfo)
        {
            var typeName = typeDefInfo.DeclaringType != null
                ? $"{typeDefInfo.DeclaringType.GetName(this)}/{typeDefInfo.Name}"
                : typeDefInfo.Namespace != null
                ? $"{typeDefInfo.Namespace}.{typeDefInfo.Name}"
                : typeDefInfo.Name;

            return new TypeNameParts(typeName, typeDefInfo.GenericTypeParameters);
        }
    }
}
