using Core.Cecil;
using Core.CecilToOutput;
using Core.Output;
using Core.Serializer;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.FullNames
{
    internal class AllNamesFetched : IFetch
    {
        internal record TokenDefinitions(TokenMap<TypeDefinition> Types, TokenMap<MethodDefinition> Methods);

        internal record TokenInfos(TokenMap<TypeInfo> Types, TokenMap<MethodPair> Methods)
        {
            static internal TokenInfos CreateNew() => new TokenInfos(new TokenMap<TypeInfo>(), new TokenMap<MethodPair>());
        }

        private class CecilData {
            TokenDefinitions _tokenDefinitions;
            TokenMaps _tokenMaps;
            ToTypeInfo _toTypeInfo;
            TokenInfos _tokenInfos;

            internal CecilData(string assemblyName, TypeDefinition[] typeDefinitions)
            {
                _tokenDefinitions = new TokenDefinitions(
                    Types: new TokenMap<TypeDefinition>(typeDefinitions.ToDictionary(typeDefinition => typeDefinition.MetadataToken.ToInt32())),
                    Methods: new TokenMap<MethodDefinition>(typeDefinitions.SelectMany(typeDefinition => typeDefinition.Methods)
                        .ToDictionary(methodDefinition => methodDefinition.MetadataToken.ToInt32()))
                    );
                _tokenMaps = TokenMaps.CreateNew();
                _toTypeInfo = ToTypeInfo.CreateToMicrosoftTypeInfo(assemblyName, _tokenMaps);
                _tokenInfos = TokenInfos.CreateNew();
            }

            internal TypeInfo FetchTypeInfo(int metadataToken)
            {
                if (_tokenInfos.Types.TryGetValue(metadataToken, out var existingTypeInfo))
                {
                    // TokenInfo can be fetched via FetchTypeInfo and/or via FetchMethodPair
                    return existingTypeInfo;
                }
                var typeDefinition = _tokenDefinitions.Types[metadataToken];
                var typeInfo = _toTypeInfo.Transform(typeDefinition);
                _tokenInfos.Types.Add(metadataToken, typeInfo);
                return typeInfo;
            }

            internal MethodPair FetchMethodPair(int metadataToken)
            {
                var methodDefinition = _tokenDefinitions.Methods[metadataToken];
                var typeInfo = FetchTypeInfo(methodDefinition.DeclaringType.MetadataToken.ToInt32());
                var methodMember = _toTypeInfo.GetMethod(methodDefinition);
                var methodPair = new MethodPair(DeclaringType: typeInfo, MethodMember: methodMember);
                _tokenInfos.Methods.Add(metadataToken, methodPair);
                return methodPair;
            }

            internal AssemblyInfo ToAssemblyInfo()
            {
                var methodMembers = _tokenInfos.Methods.Values
                    .GroupBy(methodPair => methodPair.DeclaringType.Id.LeafId.MetadataToken)
                    .ToDictionary(
                        methodPairGroup => methodPairGroup.Key,
                        methodPairGroup => methodPairGroup.Select(methodPair => methodPair.MethodMember).ToArray()
                        );
                Func<int, MethodMember[]> getMethodMembers = (typeId) => methodMembers.TryGetValue(typeId, out var members) ? members : [];

                return new AssemblyInfo(
                    ReferencedAssemblies: [], // need not return referenced assemblies
                    TypeInfos: _tokenInfos.Types.Select(kvp => kvp.Value with { MethodMembers = getMethodMembers(kvp.Key) }).ToArray(),
                    _tokenMaps.TypeSpecs,
                    _tokenMaps.MethodSpecs
                    );
            }
        }

        AllNames _allNames;
        Dictionary<string, AssemblyData> _microsoftAssemblyData;
        Dictionary<string, CecilData> _microsoftCecilData = new Dictionary<string, CecilData>();

        AssemblyMap<TokenInfos> _fetched = [];

        AllNamesFetched(All all, IEnumerable<AssemblyData> microsoftAssemblyData)
        {
            _allNames = new AllNames(all, this);
            _microsoftAssemblyData = microsoftAssemblyData.ToDictionary(a => a.Name);
        }

        public TypeInfo FetchTypeInfo(string assemblyName, int metadataToken)
        {
            var cecilData = GetCecilData(assemblyName);
            var typeInfo = cecilData.FetchTypeInfo(metadataToken);

            GetTokenInfos(assemblyName).Types.Add(metadataToken, typeInfo);

            return typeInfo;
        }

        public MethodPair FetchMethodPair(string assemblyName, int metadataToken)
        {
            var cecilData = GetCecilData(assemblyName);
            var methodPair = cecilData.FetchMethodPair(metadataToken);

            GetTokenInfos(assemblyName).Methods.Add(metadataToken, methodPair);

            return methodPair;
        }

        private CecilData GetCecilData(string assemblyName)
        {
            if (!_microsoftCecilData.TryGetValue(assemblyName, out var fetching))
            {
                var assemblyData = _microsoftAssemblyData[assemblyName];
                var typeDefinitions = assemblyData.GetTypeDefinitions(typeDefinition => true).ToArray();
                var newTokenMaps = TokenMaps.CreateNew();
                fetching = new CecilData(assemblyName, typeDefinitions);
                _microsoftCecilData[assemblyName] = fetching;
            }
            return fetching;
        }

        private TokenInfos GetTokenInfos(string assemblyName)
        {
            if (!_fetched.TryGetValue(assemblyName, out var tokenInfos))
            {
                tokenInfos = TokenInfos.CreateNew();
                _fetched.Add(assemblyName, tokenInfos);
            }
            return tokenInfos;
        }

        private void ToYaml<T>(T value) where T : notnull => value.ToYaml(_allNames, prettyPrint: true);

        internal static All Iterate(All all, IEnumerable<AssemblyData> microsoftAssemblyData)
        {
            var self = new AllNamesFetched(all, microsoftAssemblyData);

            // all.ToYaml(self, false);
            self.ToYaml(all);

            while (self._fetched.Count > 0)
            {
                var addedTokenInfos = new AssemblyMap<TokenInfos>(self._fetched);
                self._fetched.Clear();
                // visit every element of these too
                self.ToYaml(addedTokenInfos);
            }

            var microsoftAssemblies = new AssemblyMap<AssemblyInfo>(self._microsoftCecilData.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.ToAssemblyInfo()
                ));

            return all with { MicrosoftAssemblies = microsoftAssemblies };
        }
    }
}
