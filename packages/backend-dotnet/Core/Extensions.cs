using System;
using System.Collections.Generic;
using System.Linq;

namespace Core
{
    internal static class Extensions
    {
        internal static T NotNull<T>(this T? name)
        {
            if (name == null)
            {
                throw new ArgumentNullException("Unexpected null Name");
            }
            return name;
        }

        internal static string? ToStringOrNull(this string? s) => !string.IsNullOrEmpty(s) ? s : null;
        internal static T[]? ToArrayOrNull<T>(this IEnumerable<T> enumerable)
        {
            var result = enumerable.ToArray();
            return result.Length == 0 ? null : result;
        }

        //internal static string? NameSuffix(this TypeKind? kind)
        //{
        //    switch (kind)
        //    {
        //        default:
        //        case null:
        //        case TypeKind.GenericParameter: return null;
        //        case TypeKind.Array: return "[]";
        //        case TypeKind.Pointer: return "*";
        //        case TypeKind.ByReference: return "&";
        //    }
        //}
    }
}
