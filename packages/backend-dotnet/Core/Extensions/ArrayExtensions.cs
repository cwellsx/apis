using System.Collections.Generic;
using System.Linq;

namespace Core.Extensions
{
    internal static class ArrayExtensions
    {
        internal static T[]? ToArrayOrNull<T>(this IEnumerable<T> enumerable)
        {
            var result = enumerable.ToArray();
            return result.Length == 0 ? null : result;
        }
    }
}
