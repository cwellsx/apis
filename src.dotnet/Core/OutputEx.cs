using Core.Extensions;
using Core.Output.Public;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.Output.Internal
{
    /// <summary>
    /// Same as TypeId except that AssemblyName is nullable if isMicrosoftAssemblyName
    /// </summary>
    internal record TypeIdEx(
        string? AssemblyName,
        string? Namespace,
        string Name,
        Values<TypeIdEx>? GenericTypeArguments,
        TypeIdEx? DeclaringType,
        TypeKind? Kind,
        TypeIdEx? ElementType
        )
    {
        internal TypeIdEx(TypeId typeId, Func<string, bool> isMicrosoftAssemblyName) : this(
            isMicrosoftAssemblyName(typeId.AssemblyName) ? null : typeId.AssemblyName,
            typeId.Namespace,
            typeId.Name,
            typeId.GenericTypeArguments?.Select(typeId => new TypeIdEx(typeId, isMicrosoftAssemblyName)).ToArray(),
            Copy(typeId.DeclaringType, isMicrosoftAssemblyName),
            typeId.Kind,
            Copy(typeId.ElementType, isMicrosoftAssemblyName)
            )
        { }

        internal static TypeIdEx? Copy(TypeId? typeId, Func<string, bool> isMicrosoftAssemblyName) =>
            typeId == null ? null : new TypeIdEx(typeId, isMicrosoftAssemblyName);

        internal TypeIdEx Transform(Dictionary<string, TypeIdEx> transformation)
        {
            if (transformation.TryGetValue(Name, out var transformed))
            {
                return transformed;
            }

            var elementType = ElementType?.Transform(transformation);
            var isElementTypeChanged = elementType != ElementType;
            return this with
            {
                DeclaringType = DeclaringType?.Transform(transformation),
                ElementType = elementType,
                Name = elementType == null ? Name : elementType.Name + Kind.NameSuffix(),
                GenericTypeArguments = GenericTypeArguments?.Select(typeId => typeId.Transform(transformation)).ToArray(),
                Namespace = isElementTypeChanged ? elementType!.Namespace : Namespace,
                AssemblyName = isElementTypeChanged ? elementType!.AssemblyName : AssemblyName
            };
        }

        internal TypeIdEx WithoutArguments() => this with
        {
            GenericTypeArguments = null,
            Kind = Kind == TypeKind.GenericParameter ? null : Kind,
            DeclaringType = DeclaringType?.WithoutArguments()
        };

        internal TypeIdEx WithoutGenericParameters(bool isDeclaringType = false)
        {
            bool isGenericParameters = GenericTypeArguments?.All(typeId => typeId.Kind == TypeKind.GenericParameter) ?? false;
            return this with
            {
                DeclaringType = DeclaringType?.WithoutGenericParameters(true),
                ElementType = ElementType?.WithoutGenericParameters(),
                GenericTypeArguments = isDeclaringType && isGenericParameters ? null : GenericTypeArguments
            };
        }
    }

    /// <summary>
    /// Same as Parameter except with TypeIdEx
    /// </summary>
    internal record ParameterEx(
        string? Name,
        TypeIdEx Type
        )
    {
        internal ParameterEx(Parameter parameter, Func<string, bool> isMicrosoftAssemblyName) : this(
            parameter.Name,
            new TypeIdEx(parameter.Type, isMicrosoftAssemblyName)
            )
        { }

        internal ParameterEx Transform(Dictionary<string, TypeIdEx> transformation)
        {
            return this with
            {
                Type = Type.Transform(transformation)
            };
        }

        internal ParameterEx WithoutGenericParameters()
        {
            return this with
            {
                Type = Type.WithoutGenericParameters()
            };
        }
    }

    /// <summary>
    /// Same as MethodMember except without Attributes, without GenericArguments, with TypeIdEx, and with ParameterEx
    /// </summary>
    internal record MethodMemberEx(
        string Name,
        Access Access,
        Values<ParameterEx>? Parameters,
        bool? IsStatic,
        bool? IsConstructor,
        //Values<TypeId>? GenericArguments,
        TypeIdEx ReturnType
        )
    {
        internal MethodMemberEx(MethodMember methodMember, Func<string, bool> isMicrosoftAssemblyName) : this(
            methodMember.Name,
            methodMember.Access,
            methodMember.Parameters?.Select(parameter => new ParameterEx(parameter, isMicrosoftAssemblyName)).ToArray(),
            methodMember.IsStatic,
            methodMember.IsConstructor,
            new TypeIdEx(methodMember.ReturnType, isMicrosoftAssemblyName)
            )
        { }

        internal MethodMemberEx Transform(Dictionary<string, TypeIdEx> transformation)
        {
            return this with
            {
                Parameters = Parameters?.Select(parameter => parameter.Transform(transformation)).ToArray(),
                ReturnType = ReturnType.Transform(transformation)
            };
        }

        internal MethodMemberEx WithoutGenericParameters()
        {
            return this with
            {
                Parameters = Parameters?.Select(parameter => parameter.WithoutGenericParameters()).ToArray(),
                ReturnType = ReturnType.WithoutGenericParameters()
            };
        }
    }

    internal record MethodId(MethodMemberEx MethodMember, TypeIdEx declaringType, Values<TypeIdEx>? GenericTypeArguments, Values<TypeIdEx>? GenericMethodArguments)
    {
        internal MethodId(MethodMember methodMember, TypeId declaringType, Func<string, bool> isMicrosoftAssemblyName) : this(
            new MethodMemberEx(methodMember, isMicrosoftAssemblyName),
            new TypeIdEx(declaringType, isMicrosoftAssemblyName),
            declaringType.GenericTypeArguments?.Select(typeId => new TypeIdEx(typeId, isMicrosoftAssemblyName)).ToArray(),
            methodMember.GenericArguments?.Select(typeId => new TypeIdEx(typeId, isMicrosoftAssemblyName)).ToArray()
            )
        { }
    }

    internal record Decompiled(
        MethodDetails MethodDetails,
        MethodId[] Calls,
        int MetadataToken,
        MethodMemberEx MethodMember,
        Values<TypeId>? GenericArguments
        );

    internal record TypeDecompiled(TypeId[]? GenericTypeParameters, List<Decompiled> ListDecompiled);
}
