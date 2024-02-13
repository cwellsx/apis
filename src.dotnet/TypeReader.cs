using System;
using System.Collections.Generic;
using System.Linq;

namespace Core
{
    // this class has the methods to construct TypeInfo
    class TypeReader
    {
        internal static TypeInfo GetTypeInfo(Type type)
        {
            var self = new TypeReader(type);
            return self.ToTypeInfo();
        }

        Type _type;
        List<string> _exceptions = new List<string>();

        TypeReader(Type type)
        {
            _type = type;
        }

        TypeInfo ToTypeInfo()
        {
            return new TypeInfo(
                TypeId: Try(() => GetTypeId()),
                Attributes: Try(() => GetAttributes()),
                BaseType: Try(() => GetBaseType()),
                Interfaces: Try(() => GetInterfaces()),
                GenericTypeParameters: Try(() => GetGenericTypeParameters()),
                IsUnwanted: Try(() => GetIsUnwanted()),

                Exceptions: _exceptions.Count == 0 ? null : _exceptions.ToArray()
                );
        }

        T? Try<T>(Func<T?> get)
        {
            try
            {
                return get();
            }
            catch (Exception ex)
            {
                _exceptions.Add(ex.ToString());
                return default(T);
            }
        }

        TypeId GetTypeId()
        {
            return new TypeId(
                AssemblyName: _type.Assembly.GetName().Name,
                Namespace: _type.Namespace,
                Name: _type.Name,
                GenericTypeArguments: GetGenericTypeArguments(),
                DeclaringType: _type.DeclaringType != null ? GetTypeId(_type.DeclaringType) : null
            );
        }
        static TypeId GetTypeId(Type type)
        {
            var typeReader = new TypeReader(type);
            return typeReader.GetTypeId();
        }

        string[]? GetAttributes()
        {
            var list = _type.GetCustomAttributesData();
            return list.Count == 0 ? null : list.Select(attribute => attribute.ToString()).ToArray();
        }
        TypeId? GetBaseType()
        {
            var baseType = _type.BaseType;
            return baseType == null ? null : GetTypeId(baseType);
        }
        TypeId[]? GetGenericTypeArguments()
        {
            var types = _type.GenericTypeArguments;
            if (types.Length == 0) return null;
            return types.Select(GetTypeId).ToArray();
        }
        TypeId[]? GetGenericTypeParameters()
        {
            var typeInfo = _type as System.Reflection.TypeInfo;
            if (typeInfo == null) return null;
            var types = typeInfo.GenericTypeParameters;
            if (types.Length == 0) return null;
            return types.Select(GetTypeId).ToArray();
        }
        TypeId[]? GetInterfaces()
        {
            var array = _type.GetInterfaces();
            return array.Length == 0 ? null : array.Select(GetTypeId).ToArray();
        }
        bool? GetIsUnwanted()
        {
            if (_type.CustomAttributes.Any(customAttributeData => customAttributeData.AttributeType.FullName == "System.Runtime.CompilerServices.CompilerGeneratedAttribute"))
            {
                // compiler creates types, with names like "<>f__AnonymousType0`2" and "<PrivateImplementationDetails>", so they're not unique
                return true;
            }
            return null; // return null instead of false to avoid serializing `IsWanted: false` in the JSON
        }
    }
}
