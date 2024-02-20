﻿using System;
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
            foreach (var typeInfo in types)
            {
                if (typeInfo.TypeId == null && typeInfo.Exceptions == null)
                {
                    typeInfo.AddMessage("TypeInfo");
                }
            }
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
                AssemblyName: type.Assembly.GetName().Name,
                Namespace: type.Namespace,
                Name: type.Name,
                GenericTypeArguments: GetGenericTypeArguments(),
                DeclaringType: type.DeclaringType != null ? GetTypeId(type.DeclaringType) : null
            );
        }
        static TypeId? GetOptionalTypeId(Type? type) => type == null ? null : GetTypeId(type);

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
            var addMethod = memberInfo.GetAddMethod();
            return new EventMember(memberInfo.Name, GetAttributes(memberInfo), GetOptionalAccess(addMethod), GetOptionalTypeId(eventHandlerType));
        }
        PropertyMember GetProperty(PropertyInfo memberInfo)
        {
            var propertyType = memberInfo.PropertyType;
            var getMethod = memberInfo.GetMethod;
            var setMethod = memberInfo.SetMethod;
            var parameters = GetParameters(memberInfo);
            // TODO initialize isStatic
            return new PropertyMember(memberInfo.Name, GetAttributes(memberInfo), GetOptionalAccess(getMethod), GetOptionalAccess(setMethod), parameters, GetTypeId(propertyType));
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
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var parameters = GetParameters(memberInfo);
            bool? isStatic = memberInfo.IsStatic ? true : null;
            var genericArguments = (memberInfo.IsGenericMethod || memberInfo.IsGenericMethodDefinition) ? memberInfo.GetGenericArguments().Select(GetTypeId).ToArray() : null;
            return new MethodMember(memberInfo.Name, GetAttributes(memberInfo), access, parameters, isStatic, genericArguments, GetTypeId(memberInfo.ReturnType));
        }
        Parameter[]? GetParameters(PropertyInfo memberInfo) => GetParameters(memberInfo.GetIndexParameters());
        Parameter[]? GetParameters(MethodBase memberInfo) => GetParameters(memberInfo.GetParameters());
        Parameter[]? GetParameters(ParameterInfo[] parameterInfos)
        {
            var parameters = parameterInfos.Select(parameterInfo => new Parameter(parameterInfo.Name, GetTypeId(parameterInfo.ParameterType))).ToArray();
            return parameters.Length == 0 ? null : parameters;
        }

        Access? GetOptionalAccess(MethodBase? methodBase) => methodBase == null ? null : GetAccess(methodBase);
        Access GetAccess(MethodBase methodBase) => GetAccess(methodBase.IsPublic, methodBase.IsPrivate, methodBase.IsAssembly, methodBase.IsFamily, methodBase.IsFamilyAndAssembly, methodBase.IsFamilyOrAssembly);
        Access GetAccess(bool isPublic, bool isPrivate, bool isAssembly, bool isFamily, bool isFamilyAndAssembly, bool isFamilyOrAssembly) =>
            isPublic
            ? Access.Public
            : isPrivate
            ? Access.Private
            : isAssembly
            ? Access.Internal
            : Access.Protected;
    }
}
