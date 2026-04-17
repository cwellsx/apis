using Core.Cecil;
using Core.Output;
using System;
using System.Linq;
using System.Collections.Generic;

namespace Core.FullNames
{
    internal class TwoDictionariesFetched<TValue, TCecil> : TwoDictionaries<TValue> where TValue : notnull
    {
        readonly Dictionary<string, AssemblyData> _microsoftAssemblyData;
        readonly Dictionary<string, Dictionary<int, TCecil>> _allCecilData = [];

        readonly Func<AssemblyData, Dictionary<int, TCecil>> _assemblyDataConverter;
        readonly Func<TCecil, string, TValue> _cecilConverter;

        internal TwoDictionariesFetched(
            All all,
            Func<TypeInfo[], Dictionary<int, TValue>> typeInfoConverter,
            IEnumerable<AssemblyData> microsoftAssemblyData,
            Func<AssemblyData, Dictionary<int, TCecil>> assemblyDataConverter,
            Func<TCecil, string, TValue> cecilConverter
            )
            : base(all, typeInfoConverter)
        {
            _microsoftAssemblyData = microsoftAssemblyData.ToDictionary(a => a.Name);
            _assemblyDataConverter = assemblyDataConverter;
            _cecilConverter = cecilConverter;
        }

        protected override TValue Fetch(string assemblyName, int metadataToken)
        {
            if (!_allCecilData.ContainsKey(assemblyName))
            {
                var assemblyData = _microsoftAssemblyData[assemblyName];
                _allCecilData.Add(assemblyName, _assemblyDataConverter(assemblyData));
            }

            if (!Fetched.ContainsKey(assemblyName))
            {
                 Fetched.Add(assemblyName, new List<TValue>());
            }

            var cecil = _allCecilData[assemblyName][metadataToken];
            var value = _cecilConverter(cecil, assemblyName);

            Fetched[assemblyName].Add(value);
            return value;
        }

        internal Dictionary<string, List<TValue>> Fetched { get; } = [];
    }
}
