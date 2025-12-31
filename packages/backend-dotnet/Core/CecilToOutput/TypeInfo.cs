using Core.Output.Public;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal static class TypeInfo
    {
        internal static Output.Public.TypeInfo Transform(TypeDefinition typeDefinition)
        {
            if (typeDefinition.Name == "Convert")
            {
                Console.WriteLine();
            }
            return new Output.Public.TypeInfo(
                TypeId: GetTypeId(typeDefinition),
                Attributes: GetAttributes(typeDefinition.CustomAttributes),
                BaseType: GetBaseType(typeDefinition),
                Interfaces: GetInterfaces(typeDefinition),
                GenericTypeParameters: GetGenericTypeParameters(typeDefinition),
                Access: GetAccess(typeDefinition),
                Flag: GetFlag(typeDefinition),
                Members: GetMembers(typeDefinition)
                );
        }

        private static TypeId GetTypeId(TypeReference typeReference)
        {
            TypeId[]? GetGenericTypeArguments()
            {
                var genericInstanceType = typeReference as GenericInstanceType;
                if (genericInstanceType == null)
                {
                    return null;
                }
                var genericArguments = genericInstanceType.GenericArguments;
                return (genericArguments.Count == 0) ? null : genericArguments
                    .Select(GetTypeId).ToArray();
            }

            // strip modifiers e.g. from "Void modreq(System.Runtime.CompilerServices.IsExternalInit)"
            while (typeReference is OptionalModifierType || typeReference is RequiredModifierType)
            {
                typeReference = ((IModifierType)typeReference).ElementType;
            }

            var kind = GetTypeKind(typeReference);

            // prefer the metadatatoken of the definiion not of the reference
            var typeDefinition = typeReference.Resolve();
            // no definition if it's a generic parameter but it could also be e.g. an array of generic parameters
            if (typeDefinition == null && kind == null)
            {
                throw new Exception();
            }
            var metadataToken = typeReference.HasElementType() ? 0 : typeDefinition?.MetadataToken.ToInt32() ?? 0;
            var assemblyName = typeDefinition?.Module.Assembly.Name.Name ?? typeReference.Module.Assembly.Name.Name;

            return new TypeId(
                AssemblyName: assemblyName,
                Namespace: typeReference.Namespace,
                Name: typeReference.Name,
                GenericTypeArguments: GetGenericTypeArguments(),
                DeclaringType: GetOptionalTypeId(typeReference.DeclaringType),
                Kind: kind,
                ElementType: typeReference.HasElementType() ? GetOptionalTypeId(typeReference.GetElementType()) : null,
                MetadataToken: metadataToken
            );
        }

        static TypeId? GetOptionalTypeId(TypeReference? typeReference) => typeReference == null ? null : GetTypeId(typeReference);

        static bool HasElementType(this TypeReference typeReference)
        {
            switch (GetTypeKind(typeReference))
            {
                case TypeKind.Array:
                case TypeKind.ByReference:
                case TypeKind.Pointer:
                    return true;
                default:
                    return false;
            }
        }

        static TypeKind? GetTypeKind(TypeReference typeReference)
        {
            switch (CountFlags(
                typeReference.IsGenericParameter,
                typeReference.IsArray,
                typeReference.IsPointer,
                typeReference.IsByReference
                ))
            {
                case 0:
                    return null;
                case 1:
                    break;
                default:
                    throw new System.ArgumentOutOfRangeException("Expect at most one flag");
            }
            return (typeReference.IsGenericParameter)
                ? TypeKind.GenericParameter
                : typeReference.IsArray
                ? TypeKind.Array
                : typeReference.IsPointer
                ? TypeKind.Pointer
                : TypeKind.ByReference;
        }
        private static int CountFlags(params bool[] flags) => flags.Count(b => b);
        static string[]? GetAttributes(IEnumerable<CustomAttribute> customAttributes)
        {
            return !customAttributes.Any() ? null : customAttributes.Select(attribute =>
            {
                // ideally attribute.ToString() would give us this info but it doesn't
                var name = attribute.AttributeType.FullName;
                var args = attribute.ConstructorArguments.Select(arg => $"({arg.Type.Name}){arg.Value}").ToArray();
                return (args.Length != 0) ? $"[{name}({string.Join(", ", args)})]" : $"[{name}]";
            }).ToArray();
        }
        static TypeId? GetBaseType(TypeDefinition typeDefinition)
        {
            var baseType = typeDefinition.BaseType;
            return baseType == null ? null : GetTypeId(baseType);
        }
        static TypeId[]? GetGenericTypeParameters(TypeDefinition typeDefinition)
        {
            var types = typeDefinition.GenericParameters;
            return (types.Count == 0) ? null : types.Select(GetTypeId).ToArray();
        }
        static TypeId[]? GetInterfaces(TypeDefinition typeDefinition)
        {
            var array = typeDefinition.Interfaces;
            return array.Count == 0 ? null : array.Select(interfaceImlementation => GetTypeId(interfaceImlementation.InterfaceType)).ToArray();
        }

        static Access GetAccess(TypeDefinition typeDefinition)
        {
            return (!typeDefinition.IsNested)
                ? (typeDefinition.IsPublic ? Access.Public : Access.Internal)
                : (typeDefinition.IsNestedPublic ? Access.Public : typeDefinition.IsNestedPrivate ? Access.Private : Access.Internal);
        }

        static Flag? GetFlag(TypeDefinition typeDefinition)
        {
            Flag flag = Flag.None;
            if (typeDefinition.IsNested)
            {
                flag |= Flag.Nested;
            }
            if (typeDefinition.IsGenericParameter)
            {
                flag |= Flag.Generic;
            }
            if (typeDefinition.IsGenericInstance)
            {
                flag |= Flag.GenericDefinition;
            }
            return flag == Flag.None ? null : flag;
        }

        static Members GetMembers(TypeDefinition typeDefinition)
        {
            var fieldMembers = new List<FieldMember>();
            var eventMembers = new List<EventMember>();
            var propertyMembers = new List<PropertyMember>();
            var typeMembers = new List<TypeId>();
            var methodMembers = new List<MethodMember>();

            foreach (var memberInfo in typeDefinition.Fields)
            {
                fieldMembers.Add(GetField(memberInfo));
            }
            foreach (var memberInfo in typeDefinition.Events)
            {
                eventMembers.Add(GetEvent(memberInfo));
            }
            foreach (var memberInfo in typeDefinition.Properties)
            {
                propertyMembers.Add(GetProperty(memberInfo));
            }
            foreach (var memberInfo in typeDefinition.NestedTypes)
            {
                typeMembers.Add(GetTypeId(memberInfo));
            }
            foreach (var memberInfo in typeDefinition.Methods)
            {
                methodMembers.Add(GetMethod(memberInfo));
            }

            return new Members(
                fieldMembers.Count != 0 ? fieldMembers.ToArray() : null,
                eventMembers.Count != 0 ? eventMembers.ToArray() : null,
                propertyMembers.Count != 0 ? propertyMembers.ToArray() : null,
                typeMembers.Count != 0 ? typeMembers.ToArray() : null,
                methodMembers.Count != 0 ? methodMembers.ToArray() : null
                );
        }

        static FieldMember GetField(FieldDefinition memberInfo)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var fieldType = memberInfo.FieldType;
            bool? isStatic = memberInfo.IsStatic ? true : null;
            return new FieldMember(memberInfo.Name, GetAttributes(memberInfo.CustomAttributes), access, GetTypeId(fieldType), isStatic, memberInfo.MetadataToken.ToInt32());
        }
        static EventMember GetEvent(EventDefinition memberInfo)
        {
            var eventType = memberInfo.EventType;
            var addMethod = memberInfo.AddMethod;
            if (addMethod == null)
            {
                throw new ArgumentNullException();
            }
            return new EventMember(memberInfo.Name, GetAttributes(memberInfo.CustomAttributes), GetAccess(addMethod), GetOptionalTypeId(eventType), addMethod.IsStatic, memberInfo.MetadataToken.ToInt32());
        }
        static PropertyMember GetProperty(PropertyDefinition memberInfo)
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
            var parameters = GetParameters(memberInfo.Parameters);
            return new PropertyMember(memberInfo.Name, GetAttributes(memberInfo.CustomAttributes), access, parameters, GetTypeId(propertyType), isStatic, memberInfo.MetadataToken.ToInt32());
        }

        static MethodMember GetMethod(MethodDefinition memberInfo)
        {
            if (memberInfo.Name == "Deconstruct")
            {
                Logger.Log("Deconstruct");
            }
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var parameters = GetParameters(memberInfo.Parameters);
            bool? isStatic = memberInfo.IsStatic ? true : null;
            bool? isConstructor = memberInfo.IsConstructor ? true : null;
            var genericArguments = (memberInfo.HasGenericParameters) ? memberInfo.GenericParameters.Select(GetTypeId).ToArray() : null;
            return new MethodMember(memberInfo.Name, access, parameters, isStatic, isConstructor, genericArguments, GetTypeId(memberInfo.ReturnType), GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        static Parameter[]? GetParameters(IEnumerable<ParameterDefinition> parameterInfos)
        {
            var parameters = parameterInfos.Select(parameterInfo => new Parameter(parameterInfo.Name, GetTypeId(parameterInfo.ParameterType))).ToArray();
            return parameters.Length == 0 ? null : parameters;
        }

        static Access GetAccess(MethodDefinition methodBase) => GetAccess(methodBase.IsPublic, methodBase.IsPrivate, methodBase.IsAssembly, methodBase.IsFamily, methodBase.IsFamilyAndAssembly, methodBase.IsFamilyOrAssembly);
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
