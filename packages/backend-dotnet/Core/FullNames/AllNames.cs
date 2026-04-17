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
        protected record MethodTriple(MethodMember MethodMember, TypeInfo DeclaringType, string AssemblyName)
        {
            internal MethodTriple(MethodPair methodPair, string assemblyName) : this(methodPair.MethodMember, methodPair.DeclaringType, assemblyName)
            {
            }
        }

        readonly TwoDictionaries<TypeInfo> _allTypeInfos;
        readonly TwoDictionaries<MethodPair> _allMethodPairs;

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

        public string GetMethodName(object shortId, string? inAssemblyName)
        {
            var methodId = MethodFactory.FromShortName(shortId);
            var methodTriple = GetMethodTriple(methodId, inAssemblyName);
            var genericTypeArguments = methodId is GenericMethod genericMethod ? genericMethod.GenericTypeArguments : null;
            return GetMethodName(methodTriple, genericTypeArguments);
        }

        private MethodTriple GetMethodTriple(IMethodId methodId, string? inAssemblyName) => methodId switch
        {
            LocalMethod localMethod => GetMethodTriple(inAssemblyName.NotNull(), localMethod.MetadataToken),
            RemoteMethod remoteMethod => GetMethodTriple(remoteMethod.AssemblyName, remoteMethod.MetadataToken),
            GenericMethod genericMethod => GetMethodTriple(genericMethod.Resolved, inAssemblyName),
            _ => throw new NotSupportedException($"methodId: {methodId}")
        };

        public string GetTypeName(object shortId, string? inAssemblyName) => GetTypeName(TypeFactory.FromShortName(shortId), inAssemblyName, withArguments: false);

        private string GetTypeName(ITypeId shortName, string? inAssemblyName, bool withArguments) => shortName switch
        {
            FunctionType functionShortName => functionShortName.FunctionName,
            SpecificationType specificationShortName => GetSpecificationTypeName(specificationShortName, inAssemblyName),
            _ => GetBaseTypeNameParts((IBaseTypeId)shortName, inAssemblyName).AsName(withArguments)
        };

        private TypeNameParts GetBaseTypeNameParts(IBaseTypeId baseShortName, string? inAssemblyName) => baseShortName switch
        {
            LocalType localShortNeme => GetTypeNameParts(inAssemblyName.NotNull(), localShortNeme.MetadataToken),
            RemoteType remoteShortNeme => GetTypeNameParts(remoteShortNeme.AssemblyName, remoteShortNeme.MetadataToken),
            GenericParameter genericParameterShortName => new TypeNameParts(genericParameterShortName.ParameterName, null),
            _ => throw new NotSupportedException($"baseShortName: {baseShortName}")
        };

        private string GetSpecificationTypeName(SpecificationType specificationShortName, string? inAssemblyName)
        {
            var typeNameParts = GetBaseTypeNameParts(specificationShortName.Resolved, inAssemblyName);
            var genericTypeArguments = specificationShortName.GenericTypeArguments?.Select(arg => GetTypeName(arg, inAssemblyName, withArguments: true)).ToArrayOrNull();
            if (typeNameParts.GenericTypeParameters == null)
            {
                if (genericTypeArguments != null)
                {
                    throw new Exception();
                }
            }
            else
            {
                if (genericTypeArguments == null)
                {
                    throw new Exception();
                }
                if (typeNameParts.GenericTypeParameters.Length != genericTypeArguments.Length)
                {
                    throw new Exception();
                }
                typeNameParts = new TypeNameParts(typeNameParts.TypeName, genericTypeArguments);
            }
            return typeNameParts.AsName(true) + specificationShortName.Suffix;
        }

        private TypeNameParts GetTypeNameParts(string assemblyName, int metadataToken)
        {
            var typeInfo = GetTypeInfo(assemblyName, metadataToken);

            var typeName = typeInfo.DeclaringType != null
                ? $"{GetTypeName(typeInfo.DeclaringType.LeafId, assemblyName, false)}/{typeInfo.Name}"
                : typeInfo.Namespace != null
                ? $"{typeInfo.Namespace}.{typeInfo.Name}"
                : typeInfo.Name;

            return new TypeNameParts(typeName, typeInfo.GenericTypeParameters);
        }

        private MethodTriple GetMethodTriple(string assemblyName, int metadataToken) => new MethodTriple(GetMethodPair(assemblyName, metadataToken), assemblyName);

        private MethodPair GetMethodPair(string assemblyName, int metadataToken) => _allMethodPairs.Get(assemblyName, metadataToken);

        private TypeInfo GetTypeInfo(string assemblyName, int metadataToken) => _allTypeInfos.Get(assemblyName, metadataToken);

        private string GetTypeName(
            TypeInfo typeInfo,
            string inAssemblyName,
            bool withArguments
            )
        {
            var typeName = typeInfo.DeclaringType != null
                ? $"{GetTypeName(typeInfo.DeclaringType.LeafId, inAssemblyName, false)}/{typeInfo.Name}"
                : typeInfo.Namespace != null
                ? $"{typeInfo.Namespace}.{typeInfo.Name}"
                : typeInfo.Name;

            var typeNameParts = new TypeNameParts(typeName, typeInfo.GenericTypeParameters);
            return typeNameParts.AsName(withArguments);
        }

        private string GetMethodName(
            MethodTriple methodTriple,
            ITypeId[]? genericTypeArguments
            )
        {
            var (methodMember, declaringType, assemblyName) = methodTriple;

            Func<ITypeId, string> getITypeIdName = typeId => GetTypeName(typeId, assemblyName, withArguments: true);
            Func<TypeId, string> getTypeIdName = typeId => GetTypeName(typeId.LeafId, assemblyName, withArguments: true);
            Func<TypeInfo, string> getTypeInfoName = typeInfo => GetTypeName(typeInfo, assemblyName, withArguments: true);

            var returnTypeName = getTypeIdName(methodMember.ReturnType);
            var declaringTypeName = getTypeInfoName(declaringType);
            var parameterTypeNames = string.Join(",", methodMember.Parameters?.Select(parameter => getTypeIdName(parameter.Type)) ?? []);

            if (genericTypeArguments != null)
            {
                Console.WriteLine("here");
            }

            return $"{returnTypeName} {declaringTypeName}::{methodMember.Name}({parameterTypeNames})";
        }
    }
}
