using Core.Extensions;
using Core.Output;
using System.Collections.Generic;
using System.Linq;

namespace Core
{
    internal class NameFromId : INameFromId
    {
        Dictionary<string, Dictionary<LocalTypeDefId, TypeDefInfo>> _maps;

        internal NameFromId(All all)
        {
            _maps = all.Assemblies.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.TypeDefinitions.ToDictionary(
                    typeDefInfo => typeDefInfo.Id
                ));
        }

        public string GetTypeName(string assemblyName, int metadataToken)
        {
            var typeDefInfo = _maps[assemblyName][new LocalTypeDefId(assemblyName, metadataToken)];
            throw new System.NotImplementedException();
        }

        //private string GetName(TypeDefInfo typeDefInfo)
        //{
        //    var name = typeDefInfo.DeclaringType != null
        //        ? $"{}"
        //}
    }
}
