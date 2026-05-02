using Core.Cecil;
using Core.Id.Methods;
using Core.Output.Ids;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal class ToMethodId
    {
        string _assemblyName;
        ToTypeId _toTypeId;

        internal ToMethodId(string assemblyName)
        {
            _assemblyName = assemblyName;
            _toTypeId = new ToTypeId(assemblyName);
        }

        internal IEnumerable<MethodId> Convert(IEnumerable<MethodReference> methodReferences) => methodReferences
            .Where(methodReference => !IsSynthetic(methodReference))
            .Where(methodReference => !(methodReference.DeclaringType.IsLambdaCache() && methodReference.IsConstructor()))
            .Select(Convert);

        private static bool IsSynthetic(MethodReference mr)
        {
            var dt = mr.DeclaringType;

            return dt.IsArray
                || dt.IsPointer
                || dt.IsByReference
                || dt is FunctionPointerType
                || dt is GenericParameter
                //|| dt.ContainsGenericParameter
                || mr.CallingConvention == MethodCallingConvention.VarArg
                || Predicates.IsPrivateImplementationDetails(dt.FullName);
        }

        private MethodId Convert(MethodReference mr)
        {
            if (mr is MethodDefinition md)
            {
                if (md.Module.Assembly.Name.Name != _assemblyName)
                {
                    throw new Exception();
                }
                if (md.DeclaringType is not TypeDefinition)
                {
                    throw new Exception();
                }
                // referenced method definition => cannot have generic aruments
                return new MethodId(mr.FullName, new LocalMethod(md.MetadataToken.ToInt32()));
            }

            var cecilFullName0 = mr.FullName;
            md = mr.Resolve();
            var cecilFullName = mr.FullName;

            if (md.DeclaringType.Name != mr.DeclaringType.Name)
            {
                // this happens rarely but for historical reasons a reference might say System.Type where the declaring type is really System.Reflection.TypeInfo
                // our reconstruction of FullName uses the type definition so munge Cecil's FullName which uses the reference's declaring type (i.e. prefer the declaring type)
                Func<TypeReference, string> getTypeName = typeReference => string.IsNullOrEmpty(typeReference.Namespace) ? typeReference.Name : $"{typeReference.Namespace}.{typeReference.Name}";
                cecilFullName = cecilFullName.Replace(getTypeName(mr.DeclaringType), getTypeName(md.DeclaringType));
            }

            var methodId = new RemoteMethod(md.DeclaringType.Module.Assembly.Name.Name, md.MetadataToken.ToInt32());
            var genericMethodArguments = GetGenericTypeArguments(
                md.GenericParameters,
                (mr as GenericInstanceMethod)?.GenericArguments
                );

            TypeReference typeReference = mr.DeclaringType.NotNull();
            var genericTypeArguments = GetGenericTypeArguments(
                 typeReference.Resolve().GenericParameters,
                 (typeReference as GenericInstanceType)?.GenericArguments
                );

            // all generic type arguments (and parameters) were inherited from their declaring types by the nested type of which the method is a member
            // the declaring types of such a nest type are type definitions without futuer generic arguments
            var enclosingType = typeReference.DeclaringType;
            while (enclosingType != null)
            {
                if (enclosingType is GenericInstanceType)
                {
                    throw new Exception();
                }
                enclosingType = enclosingType.DeclaringType;
            }

            // concaterate -- type generic arguments, then method generic arguments
            var genericArguments = genericTypeArguments.Concat(genericMethodArguments).ToArrayOrNull();
            IMethodId leafId = (genericArguments == null) ? methodId : new GenericMethod(methodId, genericArguments);
            return new MethodId(cecilFullName, leafId);
        }

        ITypeId[] GetGenericTypeArguments(
            IList<GenericParameter> genericParameters,
            IList<TypeReference>? genericArguments
            )
        {
            if (genericArguments == null)
            {
                if (genericParameters.Count != 0)
                {
                    throw new Exception();
                }
                return [];
            }
            if (genericParameters.Count == 0)
            {
                throw new Exception();
            }
            if (genericParameters.Count != genericArguments.Count)
            {
                throw new Exception();
            }
            return _toTypeId.ConvertGenericArguments(genericArguments) ?? [];
        }

    }
}
