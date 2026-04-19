using Core.Cecil;
using Core.Filter;
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

        internal ToMethodInfo(string assemblyName)
        {
            _toTypeId = new ToTypeId(assemblyName);
            _toMethodId = new ToMethodId(assemblyName);
        }

        internal MethodInfo Transform(MethodData methodData, string asText, IFilter filter)
        {
            return new MethodInfo(
                AsText: asText,
                Called: ToMethodIds(methodData.Called, filter),
                Argued: ToMethodIds(methodData.Argued, filter),
                Locals: methodData.Locals.Select(local => _toTypeId.Convert(local.VariableType)).ToArrayOrNull()
                );
        }

        static bool _once;
        private MethodId[]? ToMethodIds(IEnumerable<MethodReference> methodReferences, IFilter filter)
        {
            if (!_once)
            {
                _once = true;
                Logger.Log("TODO: Review whether calls to Microsoft methods are captured in output");
            }
            return methodReferences
                //.Where(methodReference => !filter.IsMicrosoftAssemblyName(methodReference.DeclaringType.Scope.Name)) // don't know the Module yet
                .Where(methodReference => !IsSynthetic(methodReference))
                .Where(methodReference => !(methodReference.DeclaringType.IsLambdaCache() && methodReference.IsConstructor()))
                .Select(_toMethodId.Convert)
                //.Where(methodId => !filter.IsMicrosoftAssemblyPath(methodId.AssemblyName))
                .ToArrayOrNull();
        }

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
