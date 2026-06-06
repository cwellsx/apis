using Core.CecilToLifted;
using Core.Id.Types;
using Core.Output;
using Core.Output.Ids;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal abstract class ToTypeInfo
    {
        internal static ToTypeInfo CreateToOutputTypeInfo(string assemblyName, CompilerGenerated compilerGenerated, TokenMaps tokenMaps)
            => new ToOutputTypeInfo(assemblyName, compilerGenerated, tokenMaps);

        internal static ToTypeInfo CreateToMicrosoftTypeInfo(string assemblyName, TokenMaps tokenMaps)
            => new ToMicrosoftTypeInfo(assemblyName, tokenMaps);

        private class ToMicrosoftTypeInfo : ToTypeInfo
        {
            internal ToMicrosoftTypeInfo(string assemblyName, TokenMaps tokenMaps) : base(assemblyName, tokenMaps, null) { }

            protected override Members GetMembers(TypeDefinition typeDefinition) => new Members(null, null, null, null, null);
        }

        private class ToOutputTypeInfo : ToTypeInfo
        {
            readonly CompilerGenerated _compilerGenerated;

            internal ToOutputTypeInfo(string assemblyName, CompilerGenerated compilerGenerated, TokenMaps tokenMaps) : base(assemblyName, tokenMaps, compilerGenerated.LiftGenericParameter)
            {
                _compilerGenerated = compilerGenerated;
            }

            protected override Members GetMembers(TypeDefinition typeDefinition) => new Members(
                typeDefinition.Fields.Where(fieldDefinition => _compilerGenerated.IsUserDefined(fieldDefinition.FieldType)).Select(fieldDefinition => GetField(fieldDefinition)).ToArrayOrNull(),
                typeDefinition.Events.Select(eventdDefinition => GetEvent(eventdDefinition)).ToArrayOrNull(),
                typeDefinition.Properties.Select(propertyDefinition => GetProperty(propertyDefinition)).ToArrayOrNull(),
                typeDefinition.NestedTypes.Where(_compilerGenerated.IsUserDefined).Select(nestedType => ToLocalTypeId(nestedType)).ToArrayOrNull(),
                typeDefinition.Methods.Where(_compilerGenerated.IsUserDefined).Select(methodDefinition => GetMethod(methodDefinition)).ToArrayOrNull()
                );
        }

        protected record Members(
            FieldMember[]? FieldMembers,
            EventMember[]? EventMembers,
            PropertyMember[]? PropertyMembers,
            LocalTypeId[]? NestedTypes,
            MethodMember[]? MethodMembers
            );

        readonly string _assemblyName;
        readonly ToTypeId _toTypeId;

        protected ToTypeInfo(string assemblyName, TokenMaps tokenMaps, LiftGenericParameter? liftGenericParameter)
        {
            _assemblyName = assemblyName;
            _toTypeId = new ToTypeId(assemblyName, tokenMaps, liftGenericParameter);
        }

        protected abstract Members GetMembers(TypeDefinition typeDefinition);

        internal TypeInfo Transform(TypeDefinition typeDefinition)
        {
            var members = GetMembers(typeDefinition);
            return new TypeInfo(
                Id: ToLocalTypeId(typeDefinition),
                Namespace: typeDefinition.Namespace.ToStringOrNull(),
                Name: typeDefinition.Name,
                DeclaringType: typeDefinition.DeclaringType == null ? null : ToLocalTypeId(typeDefinition.DeclaringType),
                Attributes: GetAttributes(typeDefinition.CustomAttributes),
                BaseType: typeDefinition.BaseType == null ? null : GetTypeId(typeDefinition.BaseType),
                Interfaces: typeDefinition.Interfaces.Select(interfaceImlementation => GetTypeId(interfaceImlementation.InterfaceType)).ToArrayOrNull(),
                GenericParameters: GetGenericParameters(typeDefinition.GenericParameters),
                Access: GetAccess(typeDefinition),
                // Members
                FieldMembers: members.FieldMembers,
                EventMembers: members.EventMembers,
                PropertyMembers: members.PropertyMembers,
                NestedTypes: members.NestedTypes,
                MethodMembers: members.MethodMembers
                );
        }

        LocalTypeId ToLocalTypeId(TypeDefinition typeDefinition)
        {
            if (typeDefinition.AssemblyName() != _assemblyName)
            {
                throw new ArgumentException($"Expected type definition from assembly {_assemblyName} but got {typeDefinition.AssemblyName()}");
            }
            return new LocalTypeId(typeDefinition.FullName, new LocalType(typeDefinition.MetadataToken.ToInt32()));
        }

        TypeId GetTypeId(TypeReference tr) => _toTypeId.Convert(tr);

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

        GenericParameterId[]? GetGenericParameters(IList<Mono.Cecil.GenericParameter> genericParameters)
        {
            return (genericParameters.Count == 0) ? null : genericParameters.Select(genericParameter => new GenericParameterId(
                genericParameter.Name,
                _toTypeId.NewGenericParameter(genericParameter)
                )).ToArray();
        }

        static Access GetAccess(TypeDefinition typeDefinition)
        {
            return (!typeDefinition.IsNested)
                ? (typeDefinition.IsPublic ? Access.Public : Access.Internal)
                : (typeDefinition.IsNestedPublic ? Access.Public : typeDefinition.IsNestedPrivate ? Access.Private : Access.Internal);
        }

        FieldMember GetField(FieldDefinition memberInfo)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var fieldType = memberInfo.FieldType;
            bool? isStatic = memberInfo.IsStatic ? true : null;
            return new FieldMember(memberInfo.Name, GetTypeId(fieldType), access, isStatic, GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        EventMember GetEvent(EventDefinition memberInfo)
        {
            var eventType = memberInfo.EventType;
            var addMethod = memberInfo.AddMethod;
            if (addMethod == null)
            {
                throw new ArgumentNullException();
            }
            bool? isStatic = addMethod.IsStatic ? true : null;
            return new EventMember(memberInfo.Name, GetTypeId(eventType), GetAccess(addMethod), isStatic, GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        PropertyMember GetProperty(PropertyDefinition memberInfo)
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
            var parameters = GetParameters(memberInfo.Parameters);
            return new PropertyMember(memberInfo.Name, GetTypeId(propertyType), access, isStatic, parameters, GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        internal MethodMember GetMethod(MethodDefinition memberInfo)
        {
            var access = GetAccess(memberInfo.IsPublic, memberInfo.IsPrivate, memberInfo.IsAssembly, memberInfo.IsFamily, memberInfo.IsFamilyAndAssembly, memberInfo.IsFamilyOrAssembly);
            var parameters = GetParameters(memberInfo.Parameters);
            bool? isStatic = memberInfo.IsStatic ? true : null;
            bool? isConstructor = memberInfo.IsConstructor ? true : null;
            var genericParameters = (memberInfo.HasGenericParameters) ? GetGenericParameters(memberInfo.GenericParameters) : null;
            return new MethodMember(memberInfo.Name, access, isStatic, isConstructor, genericParameters, parameters, GetTypeId(memberInfo.ReturnType), GetAttributes(memberInfo.CustomAttributes), memberInfo.MetadataToken.ToInt32());
        }

        Parameter[]? GetParameters(IEnumerable<ParameterDefinition> parameterInfos)
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
