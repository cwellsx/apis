using Core.Cecil;
using Core.Filter;
using Core.Id.Comparers;
using Core.Output;
using Core.Output.Ids;

using Mono.Cecil;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal class ToMethodInfo
    {
        readonly ToTypeId _toTypeId;
        readonly ToMethodId _toMethodId;

        readonly static FullMethodIdComparer s_FullMethodIdComparer = new();

        internal ToMethodInfo(string assemblyName)
        {
            _toTypeId = new ToTypeId(assemblyName);
            _toMethodId = new ToMethodId(assemblyName);
        }

        internal MethodInfo Transform(MethodData methodData, string asText, IFilter filter)
        {
            // Need to ensure references are unique -- they're stored in an SQLite table with from+to as a key field.
            var called = ToMethodIds(methodData.Called, filter).ToHashSet(s_FullMethodIdComparer);
            var argued = ToMethodIds(methodData.Argued, filter).Distinct(s_FullMethodIdComparer).Where(value => !called.Contains(value));

            return new MethodInfo(
                AsText: asText,
                Called: called.ToArrayOrNull(),
                Argued: argued.ToArrayOrNull(),
                Locals: methodData.Locals.Select(local => _toTypeId.Convert(local.VariableType)).ToArrayOrNull()
                );
        }

        private IEnumerable<MethodId> ToMethodIds(IEnumerable<MethodReference> methodReferences, IFilter filter) => methodReferences
            .Where(methodReference => !IsSynthetic(methodReference))
            .Where(methodReference => !(methodReference.DeclaringType.IsLambdaCache() && methodReference.IsConstructor()))
            .Select(_toMethodId.Convert);

        private static bool IsSynthetic(MethodReference mr)
        {
            var dt = mr.DeclaringType;

            return dt.IsArray
                || dt.IsPointer
                || dt.IsByReference
                || dt is FunctionPointerType
                || dt is GenericParameter
                //|| dt.ContainsGenericParameter
                || mr.CallingConvention == MethodCallingConvention.VarArg;
        }
    }
}
