using Core.Cecil;
using Mono.Cecil;
using Mono.Cecil.Cil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal static class MethodInfo
    {
        internal static Output.MethodInfo Transform(MethodData methodData, string asText, IFilter filter)
        {
            return new Output.MethodInfo(
                AsText: asText,
                Called: ToMethodCall(methodData.Called, filter),
                Argued: ToMethodCall(methodData.Argued, filter),
                Locals: ToLocalsType(methodData.Locals.Where(IsSimple), filter)
                );
        }

        static T[]? OrNull<T>(this T[] array) where T : class => array.Length == 0 ? null : array;

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

        private static Output.MethodCall[]? ToMethodCall(IEnumerable<MethodReference> methodReferences, IFilter filter)
        {
            return methodReferences
                .Where(methodReference => !filter.IsMicrosoftAssemblyName(methodReference.DeclaringType.Scope.Name)) // don't know the Module yet
                .Where(methodReference => !(methodReference.DeclaringType.IsLambdaCache() && methodReference.IsConstructor()))
                .Select(ToMethodCall)
                .Where(methodCall => !filter.IsMicrosoftAssemblyPath(methodCall.AssemblyName))
                .ToArray()
                .OrNull();
        }

        private static Output.LocalsType[]? ToLocalsType(IEnumerable<VariableReference> variableReferences, IFilter filter)
        {
            return variableReferences
                .Where(variableReference => !filter.IsMicrosoftAssemblyName(variableReference.VariableType.Scope.Name)) // don't know the Module yet
                .Select(ToLocalsType)
                .Where(localsType => !filter.IsMicrosoftAssemblyPath(localsType.AssemblyName))
                .Distinct()
                .ToArray()
                .OrNull();
        }

        private static Output.MethodCall ToMethodCall(MethodReference methodReference)
        {
            try
            {
                var methodDefinition = methodReference.Resolve();
                return new Output.MethodCall(
                    AssemblyName: methodDefinition.DeclaringType.Module.Assembly.Name.Name,
                    MetadataToken: methodDefinition.MetadataToken.ToInt32()
                    );
            }
            catch (Exception)
            {
                Logger.Log($"Failed to resolve method {methodReference}");
                var scope = methodReference.DeclaringType.Scope;
                return new Output.MethodCall(
                    AssemblyName: scope.Name,
                    MetadataToken: null //methodReference.MetadataToken.ToInt32(),                  
                    );
            }
        }

        private static Output.LocalsType ToLocalsType(VariableReference variableReference)
        {
            try
            {
                var variableDefinition = variableReference.Resolve();
                if (0 == (variableDefinition.VariableType.MetadataToken.ToInt32() & 0xFFFFFF))
                {
                    var scope = variableReference.VariableType.Scope as AssemblyNameReference;
                    return new Output.LocalsType(
                        AssemblyName: scope!.Name,
                        MetadataToken: null
                        );
                }
                return new Output.LocalsType(
                    AssemblyName: variableDefinition.VariableType.Module.Assembly.Name.Name,
                    MetadataToken: variableDefinition.VariableType.MetadataToken.ToInt32()
                    );
            }
            catch (Exception)
            {
                Logger.Log($"Failed to resolve variable {variableReference}");
                var scope = variableReference.VariableType.Scope;
                return new Output.LocalsType(
                    AssemblyName: scope.Name,
                    MetadataToken: null
                    );
            }
        }
    }
}
