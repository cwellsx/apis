using System;
using System.Linq;
using System.Collections.Generic;

namespace Core
{
    // these methods transform the Core.IL.Output types to the Core types in Output.cs
    // the transformations are mostly one-to-one i.e. different record types with the same property names
    static class MethodReaderExtensions
    {
        internal static MethodMember Simplify(this MethodMember method, Func<string?, bool> isMicrosoftAssemblyName)
        {
            Func<TypeId, TypeId> newTypeId = WithoutAssemblyName(isMicrosoftAssemblyName);
            // the compiler adds attributes to method definitions which may not be present on method references
            // therefore remove all attributes before using this as a dictionary key
            return method.WithTypes(newTypeId, isMicrosoftAssemblyName) with { Attributes = null };
        }

        // because of "reference assemblies" the caller might disagree about which assembly defines a type
        // e.g. StringWriter might appear to be in "System.Private.CoreLib" or in "System.Runtime.Extensions"
        // so remove the assemblyName iff it's a microsoft assembly
        private static Func<TypeId, TypeId> WithoutAssemblyName(Func<string?, bool> isMicrosoftAssemblyName) =>
            (typeId) => typeId with { AssemblyName = isMicrosoftAssemblyName(typeId.AssemblyName) ? null : typeId.AssemblyName };

        internal static MethodId Transform(this Core.IL.Output.Method method, Func<string?, bool> isMicrosoftAssemblyName) => new MethodId(
            new MethodMember(
                method.Name,
                method.Attributes,
                GetAccess(method.Accessibility),
                method.Parameters.ToArrayOrNull(Transform),
                method.IsStatic.ToBoolOrNull(),
                method.IsConstructor.ToBoolOrNull(),
                method.GenericArguments.ToArrayOrNull(Transform),
                method.ReturnType.Transform()
                ).Simplify(isMicrosoftAssemblyName),
            method.DeclaringType.Transform()
            );

        static Parameter Transform(this (string, Core.IL.Output.TypeId) parameter)
        {
            var (name, type) = parameter;
            return new Parameter(name.ToStringOrNull(), type.Transform());
        }

        static TypeId Transform(this Core.IL.Output.TypeId typeId) => new TypeId(
            typeId.AssemblyName,
            typeId.Namespace,
            typeId.Name,
            typeId.GenericTypeArguments.ToArrayOrNull(Transform),
            typeId.DeclaringType?.Transform(),
            typeId.Kind.Transform(),
            typeId.ElementType?.Transform()
            );

        static TypeKind? Transform(this Core.IL.Output.Kind? kind)
        {
            switch (kind)
            {
                default:
                case null: return null;
                case Core.IL.Output.Kind.Array: return TypeKind.Array;
                case Core.IL.Output.Kind.Pointer: return TypeKind.Pointer;
                case Core.IL.Output.Kind.ByReference: return TypeKind.ByReference;
            }
        }

        private static U[]? ToArrayOrNull<T, U>(this T[]? array, Func<T, U> transform) =>
            (array == null) ? null : array.Select(transform).ToArray();

        internal static bool? ToBoolOrNull(this bool b) => b ? b : null;

        internal static string? ToStringOrNull(this string? s) => !string.IsNullOrEmpty(s) ? s : null;

        static Access GetAccess(Core.IL.Output.Accessibility accessibility)
        {
            switch (accessibility)
            {
                case Core.IL.Output.Accessibility.None: return Access.None;
                case Core.IL.Output.Accessibility.Private: return Access.Private;
                case Core.IL.Output.Accessibility.ProtectedAndInternal: return Access.PrivateProtected;
                case Core.IL.Output.Accessibility.Protected: return Access.Protected;
                case Core.IL.Output.Accessibility.Internal: return Access.Internal;
                case Core.IL.Output.Accessibility.ProtectedOrInternal: return Access.ProtectedInternal;
                case Core.IL.Output.Accessibility.Public: return Access.Public;
                default: throw new ArgumentOutOfRangeException();
            }
        }

        internal static MethodMember WithArguments(
            this MethodMember genericMethodMember,
            Values<TypeId>? genericArguments,
            TypeId[]? genericTypeParameters,
            Values<TypeId>? genericTypeArguments,
            Func<string?, bool> isMicrosoftAssemblyName
            )
        {
            Func<TypeId, TypeId> withoutAssemblyName = WithoutAssemblyName(isMicrosoftAssemblyName);
            // use just the Name as the key of the dictionary
            // the Name is a string like "T"
            // because the full TypeId of the argument also hhas a non-null DeclaringType
            // except not when the argument is a type like "T[]"
            IEnumerable<KeyValuePair<string, TypeId>> GetKvps(TypeId[]? arguments, TypeId[]? parameters) =>
                Enumerable.Range(0, arguments?.Length ?? 0)
                .Select(i => new KeyValuePair<string, TypeId>(
                    arguments![i].Name,
                    parameters![i].WithTypes(withoutAssemblyName, isMicrosoftAssemblyName)
                    ));

            var kvps = GetKvps(genericMethodMember.GenericArguments?.Array, genericArguments?.Array)
                .Concat(GetKvps(genericTypeParameters, genericTypeArguments?.Array));

            var dictionary = new Dictionary<string, TypeId>(kvps);
            Func<TypeId, TypeId> newTypeId = typeId => dictionary.TryGetValue(typeId.Name, out var value) ? value : typeId;

            return genericMethodMember.WithTypes(newTypeId, isMicrosoftAssemblyName);
        }

        private static TypeId WithTypes(this TypeId typeId, Func<TypeId, TypeId> newTypeId, Func<string?, bool> isMicrosoftAssemblyName)
        {
            typeId = newTypeId(typeId);
            var elementType = typeId.ElementType?.WithTypes(newTypeId, isMicrosoftAssemblyName);
            var isElementTypeChanged = elementType != typeId.ElementType;

            return typeId with
            {
                GenericTypeArguments = typeId.GenericTypeArguments?.Select(t => t.WithTypes(newTypeId, isMicrosoftAssemblyName)).ToArray(),
                DeclaringType = typeId.DeclaringType?.WithTypes(newTypeId, isMicrosoftAssemblyName),
                ElementType = elementType,
                Name = elementType == null ? typeId.Name : elementType.Name + typeId.Kind.NameSuffix(),
                Namespace = isElementTypeChanged ? elementType!.Namespace : typeId.Namespace,
                AssemblyName = isElementTypeChanged
                ? (isMicrosoftAssemblyName(elementType!.AssemblyName) ? null : elementType!.AssemblyName)
                : typeId.AssemblyName
            };
        }

        private static MethodMember WithTypes(this MethodMember methodMember, Func<TypeId, TypeId> newTypeId, Func<string?, bool> isMicrosoftAssemblyName)
        {
            return methodMember with
            {
                Parameters = methodMember.Parameters?.Select(parameter => parameter with { Type = parameter.Type.WithTypes(newTypeId, isMicrosoftAssemblyName) }).ToArray(),
                GenericArguments = methodMember.GenericArguments?.Select(t => t.WithTypes(newTypeId, isMicrosoftAssemblyName)).ToArray(),
                ReturnType = methodMember.ReturnType.WithTypes(newTypeId, isMicrosoftAssemblyName)
            };
        }

        internal static TypeId WithoutArguments(this TypeId typeId) => typeId with
        {
            GenericTypeArguments = null,
            Kind = typeId.Kind == TypeKind.GenericParameter ? null : typeId.Kind,
            DeclaringType = typeId.DeclaringType?.WithoutArguments()
        };

        internal static string? NameSuffix(this TypeKind? kind)
        {
            switch (kind)
            {
                default:
                case null:
                case TypeKind.GenericParameter:  return null;
                case TypeKind.Array: return "[]";
                case TypeKind.Pointer: return "*";
                case TypeKind.ByReference: return "&";
            }
        }
    }
}
