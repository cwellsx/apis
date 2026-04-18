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

        internal MethodId Convert(MethodReference mr) => new MethodId(mr.FullName, GetShortName(mr));

        internal IMethodId GetShortName(MethodReference mr)
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
                return new LocalMethod(md.MetadataToken.ToInt32());
            }

            md = mr.Resolve();
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
            return (genericArguments == null) ? methodId : new GenericMethod(methodId, genericArguments);
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
