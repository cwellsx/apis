using Core.Extensions;
using Core.Output.Public;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

// we don't use Reflection.TypeInfo which is similar to Type but requires the assembly to be loaded
// https://learn.microsoft.com/en-us/dotnet/api/system.reflection.typeinfo?view=net-8.0
using TypeInfo = Core.Output.Public.TypeInfo;

// there are types named TypeInfo and MethodInfo in the Output namespace, here is using Reflection.MethodInfo
using MethodInfo = System.Reflection.MethodInfo;

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
                ElementType: type.HasElementType ? GetOptionalTypeId(type.GetElementType()) : null,
                MetadataToken: type.MetadataToken
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
            var methodMembers = new List<MethodMember>();
            var exceptions = new List<MemberException>();

            foreach (var memberInfo in _type.GetMembers(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly))
            {
                try
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
                        methodMembers.Add(GetConstructor((ConstructorInfo)memberInfo));
                    }
                    if (memberInfo is MethodInfo)
                    {
                        methodMembers.Add(GetMethod((MethodInfo)memberInfo));
                    }
                }
                catch (Exception e)
                {
                    exceptions.Add(new MemberException(memberInfo.Name, memberInfo.MetadataToken, e.ToString()));
                }
            }
            return new Members(
                fieldMembers.Count != 0 ? fieldMembers.ToArray() : null,
                eventMembers.Count != 0 ? eventMembers.ToArray() : null,
                propertyMembers.Count != 0 ? propertyMembers.ToArray() : null,
                typeMembers.Count != 0 ? typeMembers.ToArray() : null,
                methodMembers.Count != 0 ? methodMembers.ToArray() : null,
                exceptions.Count != 0 ? exceptions.ToArray() : null
                );
        }

        FieldMember GetField(FieldInfo memberInfo)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var fieldType = memberInfo.FieldType;
            bool? isStatic = memberInfo.IsStatic ? true : null;
            return new FieldMember(memberInfo.Name, GetAttributes(memberInfo), access, GetTypeId(fieldType), isStatic, memberInfo.MetadataToken);
        }
        EventMember GetEvent(EventInfo memberInfo)
        {
            var eventHandlerType = memberInfo.EventHandlerType;
            var addMethod = memberInfo.GetAddMethod(true);
            if (addMethod == null)
            {
                throw new ArgumentNullException();
            }
            return new EventMember(memberInfo.Name, GetAttributes(memberInfo), GetAccess(addMethod), GetOptionalTypeId(eventHandlerType), addMethod.IsStatic, memberInfo.MetadataToken);
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
            return new PropertyMember(memberInfo.Name, GetAttributes(memberInfo), access, parameters, GetTypeId(propertyType), isStatic, memberInfo.MetadataToken);
        }
        MethodMember GetConstructor(ConstructorInfo memberInfo)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var parameters = GetParameters(memberInfo);
            bool? isStatic = memberInfo.IsStatic ? true : null;
            bool? isConstructor = memberInfo.IsConstructor ? true : null;
            var returnType = typeof(void);
            return new MethodMember(MethodMember.CtorName, access, parameters, isStatic, isConstructor, null, GetTypeId(returnType), GetAttributes(memberInfo), memberInfo.MetadataToken);
        }
        MethodMember GetMethod(MethodInfo memberInfo)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var parameters = GetParameters(memberInfo);
            bool? isStatic = memberInfo.IsStatic ? true : null;
            bool? isConstructor = memberInfo.IsConstructor ? true : null;
            var genericArguments = (memberInfo.IsGenericMethod || memberInfo.IsGenericMethodDefinition) ? memberInfo.GetGenericArguments().Select(GetTypeId).ToArray() : null;
            return new MethodMember(memberInfo.Name, access, parameters, isStatic, isConstructor, genericArguments, GetTypeId(memberInfo.ReturnType), GetAttributes(memberInfo), memberInfo.MetadataToken);
        }
        Parameter[]? GetParameters(PropertyInfo memberInfo) => GetParameters(memberInfo.GetIndexParameters());
        Parameter[]? GetParameters(MethodBase memberInfo) => GetParameters(memberInfo.GetParameters());
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
