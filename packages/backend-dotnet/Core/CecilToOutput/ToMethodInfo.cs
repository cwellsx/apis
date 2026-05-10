using Core.Id.Comparers;
using Core.Id.Methods;
using Core.Output;
using Core.Output.Ids;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal class ToMethodInfo
    {
        internal static Dictionary<LocalMethodId, MethodInfo> Convert(
            string assemblyName,
            MethodSummary[] methodSummaries,
            Func<int, string> decompile
            )
        {
            var toMethodInfo = new ToMethodInfo(assemblyName);
            return methodSummaries.ToDictionary(
                methodSummary => new LocalMethodId(methodSummary.FullName, new LocalMethod(methodSummary.MetadataToken.ToInt32())),
                methodSummary => toMethodInfo.Convert(methodSummary, decompile(methodSummary.MetadataToken.ToInt32()))
                );
        }

        readonly static FullMethodIdComparer s_FullMethodIdComparer = new();

        ToTypeId _toTypeId;
        ToMethodId _toMethodId;

        internal ToMethodInfo(string assemblyName)
        {
            _toTypeId = new ToTypeId(assemblyName);
            _toMethodId = new ToMethodId(assemblyName);
        }

        internal MethodInfo Convert(MethodSummary methodSummary, string asText)
        {
            Assert(!methodSummary.IsCompilerGenerated);
            // Need to ensure references are unique -- they're stored in an SQLite table with from+to as a key field.
            var called = methodSummary.Called.Select(called => _toMethodId.Convert(called)).ToHashSet(s_FullMethodIdComparer);
            var argued = methodSummary.Argued.Select(_toMethodId.Convert).Distinct(s_FullMethodIdComparer).Where(value => !called.Contains(value));
            var locals = methodSummary.Locals.Select(_toTypeId.Convert);

            return new MethodInfo(asText, called.ToArrayOrNull(), argued.ToArrayOrNull(), locals.ToArrayOrNull());
        }
    }
}
