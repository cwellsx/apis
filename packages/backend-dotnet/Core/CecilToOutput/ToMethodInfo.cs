using Core.Cecil;
using Core.Output;

using Mono.Cecil;
using Mono.Cecil.Cil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal class ToMethodInfo
    {
        readonly string _assemblyName;
        readonly ToTypeId _toTypeId;

        internal ToMethodInfo(string assemblyName)
        {
            _assemblyName = assemblyName;
            _toTypeId = new ToTypeId(assemblyName);
        }

        internal MethodInfo Transform(MethodData methodData, string asText, IFilter filter)
        {
            return new MethodInfo(
                AsText: asText,
                Called: ToMethodCall(methodData.Called, filter),
                Argued: ToMethodCall(methodData.Argued, filter),
                Locals: methodData.Locals.Select(local => _toTypeId.Convert(local.VariableType)).ToArrayOrNull()
                );
        }

        private static bool IsSimple(VariableReference variableReference) => IsSimple(variableReference.VariableType);

        private static bool IsSimple(TypeReference typeReference) =>
            !typeReference.IsArray &&
            !typeReference.IsByReference &&
            !typeReference.IsPointer &&
            !typeReference.IsPinned &&
            !typeReference.IsGenericInstance &&
            !typeReference.IsGenericParameter &&
            !typeReference.IsFunctionPointer &&
            !typeReference.IsPrimitive;

        private static MethodCall[]? ToMethodCall(IEnumerable<MethodReference> methodReferences, IFilter filter)
        {
            return methodReferences
                .Where(methodReference => !filter.IsMicrosoftAssemblyName(methodReference.DeclaringType.Scope.Name)) // don't know the Module yet
                .Where(methodReference => !(methodReference.DeclaringType.IsLambdaCache() && methodReference.IsConstructor()))
                .Select(ToMethodCall)
                .Where(methodCall => !filter.IsMicrosoftAssemblyPath(methodCall.AssemblyName))
                .ToArrayOrNull();
        }

        private static MethodCall ToMethodCall(MethodReference methodReference)
        {
            try
            {
                var methodDefinition = methodReference.Resolve();
                return new MethodCall(
                    AssemblyName: methodDefinition.DeclaringType.Module.Assembly.Name.Name,
                    MetadataToken: methodDefinition.MetadataToken.ToInt32()
                    );
            }
            catch (Exception)
            {
                Logger.Log($"Failed to resolve method {methodReference}");
                var scope = methodReference.DeclaringType.Scope;
                return new MethodCall(
                    AssemblyName: scope.Name,
                    MetadataToken: null //methodReference.MetadataToken.ToInt32(),                  
                    );
            }
        }
    }
}
