using System;
using System.Linq;

namespace Core
{
    // these methods transform the ILCore.Output types to the Core types in Output.cs
    // the transformations are mostly one-to-one i.e. different record types with the same property names
    static class MethodReaderExtensions
    {
        internal static MethodId Transform(ILCore.Output.Method method) => new MethodId(
            new MethodMember(
                method.Name,
                method.Attributes,
                GetAccess(method.Accessibility),
                method.Parameters.ToArrayOrNull(Transform),
                method.IsStatic.ToBoolOrNull(),
                method.IsConstructor.ToBoolOrNull(),
                method.GenericArguments.ToArrayOrNull(Transform),
                method.ReturnType.Transform()
                ),
            method.DeclaringType.Transform()
            );

        static Parameter Transform(this (string, ILCore.Output.TypeId) parameter)
        {
            var (name, type) = parameter;
            return new Parameter(name, type.Transform());
        }

        static TypeId Transform(this ILCore.Output.TypeId typeId) => new TypeId(
            typeId.AssemblyName,
            typeId.Namespace,
            typeId.Name,
            typeId.GenericTypeArguments.ToArrayOrNull(Transform),
            typeId.DeclaringType.TransformNullable()
            );

        static TypeId? TransformNullable(this ILCore.Output.TypeId? typeId) =>
            typeId == null ? null : typeId.Transform();

        private static U[]? ToArrayOrNull<T, U>(this T[]? array, Func<T, U> transform) =>
            (array == null) ? null : array.Select(transform).ToArray();

        private static bool? ToBoolOrNull(this bool b) => b ? b : null;

        static Access GetAccess(ILCore.Output.Accessibility accessibility)
        {
            switch (accessibility)
            {
                case ILCore.Output.Accessibility.None: return Access.None;
                case ILCore.Output.Accessibility.Private: return Access.Private;
                case ILCore.Output.Accessibility.ProtectedAndInternal: return Access.PrivateProtected;
                case ILCore.Output.Accessibility.Protected: return Access.Protected;
                case ILCore.Output.Accessibility.Internal: return Access.Internal;
                case ILCore.Output.Accessibility.ProtectedOrInternal: return Access.ProtectedInternal;
                case ILCore.Output.Accessibility.Public: return Access.Public;
                default: throw new ArgumentOutOfRangeException();
            }
        }
    }
}
