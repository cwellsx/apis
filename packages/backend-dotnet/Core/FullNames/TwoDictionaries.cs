using Core.Output;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Core.FullNames
{
    internal class TwoDictionaries<TValue> where TValue : notnull
    {
        readonly Dictionary<string, Dictionary<int, TValue>> _assemblies;
        readonly Dictionary<string, Dictionary<int, TValue>> _microsoft;

        public TwoDictionaries(All all, Func<TypeInfo[], Dictionary<int, TValue>> typeInfoConverter)
        {
            _assemblies = all.Assemblies.ToDictionary(
                kvp => kvp.Key,
                kvp => typeInfoConverter(kvp.Value.TypeInfos)
            );
            _microsoft = all.MicrosoftAssemblies.ToDictionary(
                kvp => kvp.Key,
                kvp => typeInfoConverter(kvp.Value.TypeInfos)
            );
        }

        internal TValue Get(string assemblyName, int metadataToken)
        {
            // TryGetValue
            Dictionary<int, TValue>? assemblyValues = null;
            if (_assemblies.TryGetValue(assemblyName, out assemblyValues) && assemblyValues.TryGetValue(metadataToken, out var value))
            {
                return value;
            }
            if (_microsoft.TryGetValue(assemblyName, out assemblyValues) && assemblyValues.TryGetValue(metadataToken, out var microsoftValue))
            {
                return microsoftValue;
            }

            // Fetch
            var fetchedValue = Fetch(assemblyName, metadataToken);

            // Add
            if (!_microsoft.TryGetValue(assemblyName, out assemblyValues))
            {
                assemblyValues = new Dictionary<int, TValue>();
                _microsoft.Add(assemblyName, assemblyValues);
            }
            assemblyValues.Add(metadataToken, fetchedValue);

            return fetchedValue;
        }

        internal AssemblyMap<TValue[]> GetMicrosoftValues() => new AssemblyMap<TValue[]>(_microsoft.Select(kvp => new KeyValuePair<string, TValue[]>(kvp.Key, kvp.Value.Values.ToArray())));

        protected virtual TValue Fetch(string assemblyName, int metadataToken) => throw new Exception($"assemblyName: {assemblyName}, metadataToken: {metadataToken}");
    }
}
