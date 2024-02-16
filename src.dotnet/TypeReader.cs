using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

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

        internal static void Verify(TypeInfo[] types)
        {
            var all = types.Where(type => type.TypeId != null).ToDictionary(type => type.TypeId!);
            foreach (var (typeId, typeInfo) in all.Select(kvp => (kvp.Key, kvp.Value)))
            {
                Func<Flags, bool> isFlag = (flag) => typeInfo.HasFlag(flag);
                Action<bool, string> assert = (b, message) =>
                {
                    if (!b) typeInfo.AddMessage(message);
                };
                var index = typeId.Name.IndexOf("`");
                int? n = index == -1 ? null : int.Parse(typeId.Name.Substring(index + 1));
                if (n.HasValue)
                {
                    assert(isFlag(Flags.Generic), "Generic name");
                    var args = typeInfo.HasFlag(Flags.GenericDefinition) ? typeInfo.GenericTypeParameters : typeId.GenericTypeArguments;
                    assert(n == (args?.Length) || (n.HasValue && args != null && n.Value <= args.Length), "Generic arguments");
                }
                else if (typeInfo.HasFlag(Flags.Generic))
                {
                    var args = typeInfo.HasFlag(Flags.GenericDefinition) ? typeInfo.GenericTypeParameters : typeId.GenericTypeArguments;
                    assert(args != null, "Generic arguments");
                }
                assert(isFlag(Flags.Nested) == (typeId.DeclaringType != null), "Nested");
                if (typeId.DeclaringType != null) assert(all.ContainsKey(typeId.DeclaringType), "Declaring type");
                if (typeInfo.Attributes != null) assert(typeInfo.Attributes.Distinct().Count() == typeInfo.Attributes.Length, "Unique attributes");
            }
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
                Flags: Try(() => GetFlags()),

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
            var list = _type.GetCustomAttributesData().Where(attribute
                => attribute.AttributeType.Namespace != "System.Runtime.CompilerServices"
                && attribute.AttributeType.Name != "AttributeUsageAttribute"
                && attribute.AttributeType.Name != "EmbeddedAttribute"
                );
            return !list.Any() ? null : list.Select(attribute =>
           {
                // ideally attribute.ToString() would give us this info but it doesn't
                var name = attribute.AttributeType.FullName;
               var constructorArguments = attribute.ConstructorArguments.Select(arg => arg.ToString());
               var namedArguments = attribute.NamedArguments.Select(arg => arg.ToString());
               var args = constructorArguments.Concat(namedArguments).ToArray();
               return (args.Length != 0) ? $"[{name}({string.Join(", ", args)})]" : $"[{name}]";
           }).ToArray();
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
        Flags[] GetFlags()
        {
            var flags = new List<Flags>();
            flags.Add((!_type.IsNested)
                ? (_type.IsPublic ? Flags.Public : Flags.Internal)
                : (_type.IsNestedPublic ? Flags.Public : _type.IsNestedPrivate ? Flags.Private : Flags.Internal));
            if (_type.IsNested) flags.Add(Flags.Nested);
            if (_type.IsGenericType) flags.Add(Flags.Generic);
            if (_type.IsGenericTypeDefinition) flags.Add(Flags.GenericDefinition);
            return flags.ToArray();
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
