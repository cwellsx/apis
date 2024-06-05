using Core.Output.Internal;
using Core.Output.Public;
using System;
using System.Linq;

namespace Core.Extensions
{
    // these methods transform the Core.IL.Output types to the Core types in Output.cs
    // the transformations are mostly one-to-one i.e. different record types with the same property names
    static class MethodDecompilerExtensions
    {
        internal static MethodId Transform(this Core.IL.Output.Method method, Func<string, bool> isMicrosoftAssemblyName) => new MethodId(
            new MethodMember(
                method.Name,
                //method.Attributes,
                GetAccess(method.Accessibility),
                method.Parameters.ToArrayOrNull(Transform),
                method.IsStatic.ToBoolOrNull(),
                method.IsConstructor.ToBoolOrNull(),
                method.GenericArguments.ToArrayOrNull(Transform),
                method.ReturnType.Transform(),
                // MetadataToken and Attributes will be discarded when this is converted to MethodIdEx
                null, 0
                ),
            method.DeclaringType.Transform(),
            isMicrosoftAssemblyName
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
            typeId.ElementType?.Transform(),
            // MetadataToken will be discarded when this is converted to TypeIdEx
            0
            );

        static TypeKind? Transform(this Core.IL.Output.Kind? kind)
        {
            switch (kind)
            {
                default:
                case null: return null;
                case Core.IL.Output.Kind.GenericParameter: return TypeKind.GenericParameter;
                case Core.IL.Output.Kind.Array: return TypeKind.Array;
                case Core.IL.Output.Kind.Pointer: return TypeKind.Pointer;
                case Core.IL.Output.Kind.ByReference: return TypeKind.ByReference;
            }
        }

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

        static U[]? ToArrayOrNull<T, U>(this T[]? array, Func<T, U> transform) =>
            (array == null) ? null : array.Select(transform).ToArray();

        static bool? ToBoolOrNull(this bool b) => b ? b : null;
    }
}
