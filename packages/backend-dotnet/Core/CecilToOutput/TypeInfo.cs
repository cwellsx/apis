using Core.Extensions;
using Core.Output;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal static class TypeInfo
    {
        internal static TypeDefInfo Transform(TypeDefinition typeDefinition)
        {
            if (typeDefinition.Name == "Convert")
            {
                Console.WriteLine();
            }
            return new TypeDefInfo(
                Id: new LocalTypeDefId(typeDefinition.MetadataToken.ToInt32()),
                Namespace: typeDefinition.Namespace.ToStringOrNull(),
                Name: typeDefinition.Name,
                DeclaringType: typeDefinition.DeclaringType == null ? null : (LocalTypeDefId)GetTypeId(typeDefinition.DeclaringType, typeDefinition),
                Attributes: GetAttributes(typeDefinition.CustomAttributes),
                BaseType: typeDefinition.BaseType == null ? null : GetTypeId(typeDefinition.BaseType, typeDefinition),
                Interfaces: typeDefinition.Interfaces.Select(interfaceImlementation => GetTypeId(interfaceImlementation.InterfaceType, typeDefinition)).ToArrayOrNull(),
                GenericTypeParameters: GetGenericParameters(typeDefinition.GenericParameters),
                Access: GetAccess(typeDefinition),
                // Members
                FieldMembers: typeDefinition.Fields.Select(fieldDefinition => GetField(fieldDefinition, typeDefinition)).ToArrayOrNull(),
                EventMembers: typeDefinition.Events.Select(eventdDefinition => GetEvent(eventdDefinition, typeDefinition)).ToArrayOrNull(),
                PropertyMembers: typeDefinition.Properties.Select(propertyDefinition => GetProperty(propertyDefinition, typeDefinition)).ToArrayOrNull(),
                TypeMembers: typeDefinition.NestedTypes.Select(nestedType => GetTypeId(nestedType, typeDefinition)).ToArrayOrNull(),
                MethodMembers: typeDefinition.Methods.Select(methodDefinition => GetMethod(methodDefinition, typeDefinition)).ToArrayOrNull()
                );
        }

        private static TypeId GetTypeId(TypeReference tr, TypeDefinition typeDefinition) => ToTypeId.Convert(tr);

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

        static string[]? GetGenericParameters(IList<GenericParameter> genericParameters)
        {
            return (genericParameters.Count == 0) ? null : genericParameters.Select(genericParameter => genericParameter.Name).ToArray();
        }

        static Access GetAccess(TypeDefinition typeDefinition)
        {
            return (!typeDefinition.IsNested)
                ? (typeDefinition.IsPublic ? Access.Public : Access.Internal)
                : (typeDefinition.IsNestedPublic ? Access.Public : typeDefinition.IsNestedPrivate ? Access.Private : Access.Internal);
        }

        static FieldMember GetField(FieldDefinition memberInfo, TypeDefinition typeDefinition)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var fieldType = memberInfo.FieldType;
            bool? isStatic = memberInfo.IsStatic ? true : null;
            return new FieldMember(memberInfo.Name, GetTypeId(fieldType, typeDefinition), access, isStatic, GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        static EventMember GetEvent(EventDefinition memberInfo, TypeDefinition typeDefinition)
        {
            var eventType = memberInfo.EventType;
            var addMethod = memberInfo.AddMethod;
            if (addMethod == null)
            {
                throw new ArgumentNullException();
            }
            bool? isStatic = addMethod.IsStatic ? true : null;
            return new EventMember(memberInfo.Name, GetTypeId(eventType, typeDefinition), GetAccess(addMethod), isStatic, GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        static PropertyMember GetProperty(PropertyDefinition memberInfo, TypeDefinition typeDefinition)
        {
            var propertyType = memberInfo.PropertyType;
            var getMethod = memberInfo.GetMethod;
            var setMethod = memberInfo.SetMethod;
            (Access, bool?) Get()
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
                bool? isStatic = getMethod.IsStatic ? true : null; // doesn't matter which method we use here
                return (access, isStatic);
            }
            var (access, isStatic) = Get();
            var parameters = GetParameters(memberInfo.Parameters, typeDefinition);
            return new PropertyMember(memberInfo.Name, GetTypeId(propertyType, typeDefinition), access, isStatic, parameters, GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        static MethodMember GetMethod(MethodDefinition memberInfo, TypeDefinition typeDefinition)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var parameters = GetParameters(memberInfo.Parameters, typeDefinition);
            bool? isStatic = memberInfo.IsStatic ? true : null;
            bool? isConstructor = memberInfo.IsConstructor ? true : null;
            var genericParameters = (memberInfo.HasGenericParameters) ? GetGenericParameters(memberInfo.GenericParameters) : null;
            return new MethodMember(memberInfo.Name, access, isStatic, isConstructor, genericParameters, parameters, GetTypeId(memberInfo.ReturnType, typeDefinition), GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        static Parameter[]? GetParameters(IEnumerable<ParameterDefinition> parameterInfos, TypeDefinition typeDefinition)
        {
            var parameters = parameterInfos.Select(parameterInfo => new Parameter(parameterInfo.Name, GetTypeId(parameterInfo.ParameterType, typeDefinition))).ToArray();
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
