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
            foreach (var typeInfo in types)
            {
                if (typeInfo.TypeId == null && typeInfo.Exceptions == null)
                {
                    typeInfo.AddMessage("TypeInfo");
                }
            }
            var all = types.Where(type => type.TypeId != null).ToDictionary(type => type.TypeId!);
            foreach (var (typeId, typeInfo) in all.Select(kvp => (kvp.Key, kvp.Value)))
            {
                Func<Flag, bool> hasFlag = (flag) => typeInfo.Flag.HasValue && ((typeInfo.Flag.Value & flag) == flag);
                Action<bool, string> assert = (b, message) =>
                {
                    if (!b)
                    {
                        typeInfo.AddMessage(message);
                    }
                };
                var index = typeId.Name.IndexOf("`");
                int? n = index == -1 ? null : int.Parse(typeId.Name.Substring(index + 1));
                if (n.HasValue)
                {
                    assert(hasFlag(Flag.Generic), "Generic name");
                    var args = hasFlag(Flag.GenericDefinition) ? typeInfo.GenericTypeParameters : typeId.GenericTypeArguments;
                    assert(n == (args?.Length) || (n.HasValue && args != null && n.Value <= args.Length), "Generic arguments");
                }
                else if (hasFlag(Flag.Generic))
                {
                    var args = hasFlag(Flag.GenericDefinition) ? typeInfo.GenericTypeParameters : typeId.GenericTypeArguments;
                    assert(args != null, "Generic arguments");
                }
                assert(hasFlag(Flag.Nested) == (typeId.DeclaringType != null), "Nested");
                if (typeId.DeclaringType != null)
                {
                    assert(all.ContainsKey(typeId.DeclaringType), "Declaring type");
                }

                if (typeInfo.Attributes != null)
                {
                    assert(typeInfo.Attributes.Distinct().Count() == typeInfo.Attributes.Length, "Unique attributes");
                }

                assert(typeId.GenericTypeArguments == null, "Generic arguments");
                assert(typeId.AssemblyName != null, "Type assembly name");
                assert((typeId.ElementType != null) == (typeId.Kind.NameSuffix() != null), "Type element type");
                if (typeId.ElementType != null)
                {
                    assert((typeId.Name == typeId.ElementType.Name + typeId.Kind.NameSuffix()), "Type element type");
                }
                var methodMembers = typeInfo.Members?.MethodMembers;
                if (methodMembers != null)
                {
                    foreach (var methodMember in methodMembers)
                    {
                        assert(methodMember.ReturnType.AssemblyName != null, "ReturnType assembly name");
                    }
                }
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
            var typeId = Try(() => GetTypeId());
            return new TypeInfo(
                TypeId: typeId,
                Attributes: Try(() => GetAttributes()),
                BaseType: Try(() => GetBaseType()),
                Interfaces: Try(() => GetInterfaces()),
                GenericTypeParameters: Try(() => GetGenericTypeParameters()),
                Access: Try(() => GetAccess()),
                Flag: Try(() => GetFlag()),
                Members: Try(() => GetMembers()),

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

        TypeId GetTypeId() => GetTypeId(_type);
        static TypeId GetTypeId(Type type)
        {
            TypeId[]? GetGenericTypeArguments()
            {
                var types = type.GenericTypeArguments;
                return (types.Length == 0) ? null : types.Select(GetTypeId).ToArray();
            }
            return new TypeId(
                AssemblyName: type.Assembly.GetName().Name.NotNull(),
                Namespace: type.Namespace,
                Name: type.Name,
                GenericTypeArguments: GetGenericTypeArguments(),
                DeclaringType: GetOptionalTypeId(type.DeclaringType),
                Kind: GetTypeKind(type),
                ElementType: type.HasElementType ? GetOptionalTypeId(type.GetElementType()) : null
            );
        }
        static TypeId? GetOptionalTypeId(Type? type) => type == null ? null : GetTypeId(type);

        static TypeKind? GetTypeKind(Type type)
        {
            switch (CountFlags(
                type.IsGenericParameter,
                type.IsArray,
                type.IsPointer,
                type.IsByRef
                ))
            {
                case 0:
                    return null;
                case 1:
                    break;
                default:
                    throw new ArgumentOutOfRangeException("Expect at most one flag");
            }
            return (type.IsGenericParameter)
                ? TypeKind.GenericParameter
                : type.IsArray
                ? TypeKind.Array
                : type.IsPointer
                ? TypeKind.Pointer
                : TypeKind.ByReference;
        }
        private static int CountFlags(params bool[] flags) => flags.Count(b => b);

        string[]? GetAttributes() => GetAttributes(_type);
        static string[]? GetAttributes(MemberInfo memberInfo)
        {
            var list = memberInfo.GetCustomAttributesData();
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
        TypeId[]? GetGenericTypeParameters()
        {
            var typeInfo = _type as System.Reflection.TypeInfo;
            if (typeInfo == null)
            {
                return null;
            }

            var types = typeInfo.GenericTypeParameters;
            return (types.Length == 0) ? null : types.Select(GetTypeId).ToArray();
        }
        TypeId[]? GetInterfaces()
        {
            var array = _type.GetInterfaces();
            return array.Length == 0 ? null : array.Select(GetTypeId).ToArray();
        }
        Access GetAccess()
        {
            return (!_type.IsNested)
                ? (_type.IsPublic ? Access.Public : Access.Internal)
                : (_type.IsNestedPublic ? Access.Public : _type.IsNestedPrivate ? Access.Private : Access.Internal);
        }
        Flag? GetFlag()
        {
            Flag flag = Flag.None;
            if (_type.IsNested)
            {
                flag |= Flag.Nested;
            }
            if (_type.IsGenericType)
            {
                flag |= Flag.Generic;
            }
            if (_type.IsGenericTypeDefinition)
            {
                flag |= Flag.GenericDefinition;
            }
            return flag == Flag.None ? null : flag;
        }

        Members GetMembers()
        {
            var fieldMembers = new List<FieldMember>();
            var eventMembers = new List<EventMember>();
            var propertyMembers = new List<PropertyMember>();
            var typeMembers = new List<TypeId>();
            var constructorMembers = new List<ConstructorMember>();
            var methodMembers = new List<MethodMember>();

            foreach (var memberInfo in _type.GetMembers(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly))
            {
                if (memberInfo is FieldInfo)
                {
                    fieldMembers.Add(GetField((FieldInfo)memberInfo));
                }
                if (memberInfo is EventInfo)
                {
                    eventMembers.Add(GetEvent((EventInfo)memberInfo));
                }
                if (memberInfo is PropertyInfo)
                {
                    propertyMembers.Add(GetProperty((PropertyInfo)memberInfo));
                }
                if (memberInfo is System.Reflection.TypeInfo)
                {
                    typeMembers.Add(GetTypeId((System.Reflection.TypeInfo)memberInfo));
                }
                if (memberInfo is ConstructorInfo)
                {
                    constructorMembers.Add(GetConstructor((ConstructorInfo)memberInfo));
                }
                if (memberInfo is MethodInfo)
                {
                    methodMembers.Add(GetMethod((MethodInfo)memberInfo));
                }
            }
            return new Members(
                fieldMembers.Count != 0 ? fieldMembers.ToArray() : null,
                eventMembers.Count != 0 ? eventMembers.ToArray() : null,
                propertyMembers.Count != 0 ? propertyMembers.ToArray() : null,
                typeMembers.Count != 0 ? typeMembers.ToArray() : null,
                constructorMembers.Count != 0 ? constructorMembers.ToArray() : null,
                methodMembers.Count != 0 ? methodMembers.ToArray() : null
                );
        }

        FieldMember GetField(FieldInfo memberInfo)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var fieldType = memberInfo.FieldType;
            bool? isStatic = memberInfo.IsStatic ? true : null;
            return new FieldMember(memberInfo.Name, GetAttributes(memberInfo), access, GetTypeId(fieldType), isStatic);
        }
        EventMember GetEvent(EventInfo memberInfo)
        {
            var eventHandlerType = memberInfo.EventHandlerType;
            var addMethod = memberInfo.GetAddMethod(true);
            if (addMethod == null)
            {
                throw new ArgumentNullException();
            }
            return new EventMember(memberInfo.Name, GetAttributes(memberInfo), GetAccess(addMethod), GetOptionalTypeId(eventHandlerType), addMethod.IsStatic);
        }
        PropertyMember GetProperty(PropertyInfo memberInfo)
        {
            var propertyType = memberInfo.PropertyType;
            var getMethod = memberInfo.GetMethod;
            var setMethod = memberInfo.SetMethod;
            (Access, bool) Get()
            {
                if (getMethod == null)
                {
                    if (setMethod == null)
                    {
                        throw new ArgumentNullException();
                    }
                    return (GetAccess(setMethod), setMethod.IsStatic);
                }
                else
                {
                    if (setMethod == null)
                    {
                        return (GetAccess(getMethod), getMethod.IsStatic);
                    }
                }
                var access = (Access)Math.Min((int)GetAccess(getMethod), (int)GetAccess(setMethod));
                var isStatic = getMethod.IsStatic; // doesn't matter which method we use here
                return (access, isStatic);
            }
            var (access, isStatic) = Get();
            var parameters = GetParameters(memberInfo);
            return new PropertyMember(memberInfo.Name, GetAttributes(memberInfo), access, parameters, GetTypeId(propertyType), isStatic);
        }
        ConstructorMember GetConstructor(ConstructorInfo memberInfo)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var parameters = GetParameters(memberInfo);
            bool? isStatic = memberInfo.IsStatic ? true : null;
            return new ConstructorMember(GetAttributes(memberInfo), access, parameters, isStatic);
        }
        MethodMember GetMethod(MethodInfo memberInfo)
        {
            if (memberInfo.Name == "TryParseExpression")
            {
                Console.WriteLine("found");
            }
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var parameters = GetParameters(memberInfo);
            bool? isStatic = memberInfo.IsStatic ? true : null;
            bool? isConstructor = memberInfo.IsConstructor ? true : null;
            var genericArguments = (memberInfo.IsGenericMethod || memberInfo.IsGenericMethodDefinition) ? memberInfo.GetGenericArguments().Select(GetTypeId).ToArray() : null;
            return new MethodMember(memberInfo.Name, access, parameters, isStatic, isConstructor, genericArguments, GetTypeId(memberInfo.ReturnType), GetAttributes(memberInfo), memberInfo.MetadataToken);
        }
        Parameter[]? GetParameters(PropertyInfo memberInfo) => GetParameters(memberInfo.GetIndexParameters());
        Parameter[]? GetParameters(MethodBase memberInfo)
        {
            try
            {
                var parameterInfos = memberInfo.GetParameters();
                return GetParameters(parameterInfos);

            }
            catch (Exception ex)
            {
                Logger.Log(ex);
                return null;
            }
        }
        Parameter[]? GetParameters(ParameterInfo[] parameterInfos)
        {
            var parameters = parameterInfos.Select(parameterInfo => new Parameter(parameterInfo.Name.ToStringOrNull(), GetTypeId(parameterInfo.ParameterType))).ToArray();
            return parameters.Length == 0 ? null : parameters;
        }

        Access GetAccess(MethodBase methodBase) => GetAccess(methodBase.IsPublic, methodBase.IsPrivate, methodBase.IsAssembly, methodBase.IsFamily, methodBase.IsFamilyAndAssembly, methodBase.IsFamilyOrAssembly);
        static Access GetAccess(bool isPublic, bool isPrivate, bool isAssembly, bool isFamily, bool isFamilyAndAssembly, bool isFamilyOrAssembly) =>
            isPublic
            ? Access.Public
            : isPrivate
            ? Access.Private
            : isAssembly
            ? Access.Internal
            : isFamily
            ? Access.Protected
            : isFamilyOrAssembly
            ? Access.ProtectedInternal
            : isFamilyAndAssembly
            ? Access.PrivateProtected
            : Access.None;
    }
}
