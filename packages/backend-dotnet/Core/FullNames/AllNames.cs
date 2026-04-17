using Core.Id;
using Core.Id.Methods;
using Core.Id.Types;
using Core.Output;
using Core.Output.Ids;
using System;
using System.Linq;

namespace Core.FullNames
{
    internal class AllNames : INames
    {
        protected record MethodPair(MethodMember MethodMember, TypeInfo DeclaringType);

        private record AssemblyTypeInfo(string AssemblyName, TypeInfo TypeInfo, string InAssemblyName);
        private record AssemblyMethodPair(string AssemblyName, TypeInfo DeclaringType, MethodMember MethodMember, string InAssemblyName);

        readonly TwoDictionaries<TypeInfo> _allTypeInfos;
        readonly TwoDictionaries<MethodPair> _allMethodPairs;

        #region ctors

        internal AllNames(All all)
        {
            _allTypeInfos = new TwoDictionaries<TypeInfo>(all, typeInfos => typeInfos.ToDictionary(typeInfo => typeInfo.Id.LeafId.MetadataToken));

            _allMethodPairs = new TwoDictionaries<MethodPair>(all, typeInfos => typeInfos
                .SelectMany(
                    typeInfo => typeInfo.MethodMembers ?? [],
                    (typeInfo, methodMember) => new MethodPair(methodMember, typeInfo)
                    )
                .ToDictionary(methodPair => methodPair.MethodMember.MetadataToken));
        }

        protected AllNames(All all, TwoDictionaries<TypeInfo> allTypeInfos)
        {
            _allTypeInfos = allTypeInfos;

            _allMethodPairs = new TwoDictionaries<MethodPair>(all, typeInfos => typeInfos
                .SelectMany(
                    typeInfo => typeInfo.MethodMembers ?? [],
                    (typeInfo, methodMember) => new MethodPair(methodMember, typeInfo)
                    )
                .ToDictionary(methodPair => methodPair.MethodMember.MetadataToken));
        }

        #endregion

        public string GetTypeName(object shortId, string inAssemblyName) => GetTypeName(TypeFactory.FromShortName(shortId), inAssemblyName);

        public string GetMethodName(object shortId, string inAssemblyName) => GetMethodName(MethodFactory.FromShortName(shortId), inAssemblyName);

        private string GetTypeName(ITypeId typeId, string inAssemblyName)
        {
            // two special cases, with names encoded in the shortId, return immediately and don't try to find the TypeInfo
            switch (typeId)
            {
                case FunctionType functionType:
                    return functionType.FunctionName;
                case GenericParameter genericParameter:
                    return genericParameter.ParameterName;
            }

            if (typeId is SpecificationType specificationType)
            {
                if (specificationType.Resolved is GenericParameter genericParameter)
                {
                    Assert(specificationType.GenericTypeArguments == null);
                    Assert(specificationType.Suffix != null);
                    return genericParameter.ParameterName + specificationType.Suffix;
                }

                return GetTypeName(GetAssemblyTypeInfo(specificationType.Resolved, inAssemblyName), specificationType.GenericTypeArguments, specificationType.Suffix);
            }
            else
            {
                return GetTypeName(GetAssemblyTypeInfo(typeId, inAssemblyName), null, null);
            }
        }

        private AssemblyTypeInfo GetAssemblyTypeInfo(ITypeId typeId, string inAssemblyName)
        {
            var (assemblyName, metadataToken) = typeId switch
            {
                LocalType localType => (inAssemblyName, localType.MetadataToken),
                RemoteType remoteType => (remoteType.AssemblyName, remoteType.MetadataToken),
                _ => throw new NotSupportedException($"typeId: {typeId}")
            };
            var typeInfo = _allTypeInfos.Get(assemblyName, metadataToken);
            return new AssemblyTypeInfo(assemblyName, typeInfo, inAssemblyName);
        }

        private string GetTypeName(AssemblyTypeInfo assemblyTypeInfo, ITypeId[]? genericTypeArguments, string? suffix)
        {
            var (assemblyName, typeInfo, inAssemblyName) = assemblyTypeInfo;
            var typeName = typeInfo.DeclaringType != null
                ? $"{GetTypeName(typeInfo.DeclaringType.LeafId, assemblyName)}/{typeInfo.Name}"
                : typeInfo.Namespace != null
                ? $"{typeInfo.Namespace}.{typeInfo.Name}"
                : typeInfo.Name;

            if (genericTypeArguments != null)
            {
                typeName += $"<{string.Join(",", genericTypeArguments.Select(arg => GetTypeName(arg, inAssemblyName)))}>";
            }

            return typeName + suffix;
        }

        private string GetMethodName(IMethodId methodId, string inAssemblyName)
        {
            if (methodId is GenericMethod genericMethod)
            {
                return GetMethodName(GetAssemblyMethodPair(genericMethod.Resolved, inAssemblyName), genericMethod.GenericTypeArguments);
            }
            else
            {
                return GetMethodName(GetAssemblyMethodPair(methodId, inAssemblyName), null);
            }
        }

        private AssemblyMethodPair GetAssemblyMethodPair(IMethodId methodId, string inAssemblyName)
        {
            var (assemblyName, metadataToken) = methodId switch
            {
                LocalMethod localMethod => (inAssemblyName, localMethod.MetadataToken),
                RemoteMethod remoteMethod => (remoteMethod.AssemblyName, remoteMethod.MetadataToken),
                _ => throw new NotSupportedException($"methodId: {methodId}")
            };
            var methodPair = _allMethodPairs.Get(assemblyName, metadataToken);
            return new AssemblyMethodPair(assemblyName, methodPair.DeclaringType, methodPair.MethodMember, inAssemblyName);
        }

        private string GetMethodName(AssemblyMethodPair assemblyMethodPair, ITypeId[]? genericTypeArguments)
        {
            var (assemblyName, declaringType, methodMember, inAssemblyName) = assemblyMethodPair;

            Func<TypeId, string> getTypeIdName = typeId => GetTypeName(typeId.LeafId, assemblyName);

            var returnTypeName = getTypeIdName(methodMember.ReturnType);
            var declaringTypeName = GetTypeName(new AssemblyTypeInfo(assemblyName, declaringType, inAssemblyName), null, null);
            var parameterTypeNames = string.Join(",", methodMember.Parameters?.Select(parameter => getTypeIdName(parameter.Type)) ?? []);

            return $"{returnTypeName} {declaringTypeName}::{methodMember.Name}({parameterTypeNames})";
        }
    }
}
