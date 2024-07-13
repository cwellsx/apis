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
    public record TypeIdEx(
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
    }

    /// <summary>
    /// Same as Parameter except with TypeIdEx
    /// </summary>
    public record ParameterEx(
        string? Name,
        TypeIdEx Type
        )
    {
        internal ParameterEx(Parameter parameter, Func<string, bool> isMicrosoftAssemblyName) : this(
            parameter.Name,
            new TypeIdEx(parameter.Type, isMicrosoftAssemblyName)
            )
        { }
    }

    /// <summary>
    /// Same as MethodMember except without Attributes, without GenericArguments, with TypeIdEx, and with ParameterEx
    /// </summary>
    public record MethodMemberEx(
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
    }

    internal record MethodId(MethodMemberEx MethodMember, TypeIdEx DeclaringType, Values<TypeIdEx>? GenericTypeArguments, Values<TypeIdEx>? GenericMethodArguments)
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
        MethodId[] CalledMethods,
        MethodId[] ArguedMethods,
        TypeIdEx[] LocalsTypes,
        int MetadataToken,
        MethodMemberEx MethodMember,
        Values<TypeId>? GenericArguments
        );

    internal record TypeDecompiled(TypeInfo TypeInfo, List<Decompiled> ListDecompiled)
    {
        internal TypeId[]? GenericTypeParameters => TypeInfo.GenericTypeParameters;
    }
}
