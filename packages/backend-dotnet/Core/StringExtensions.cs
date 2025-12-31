using Core.Output.Public;

namespace Core
{
    internal static class StringExtensions
    {
        internal static string NotNull(this string? name)
        {
            if (name == null)
            {
                throw new System.ArgumentNullException("Unexpected null Name");
            }
            return name;
        }

        internal static string? ToStringOrNull(this string? s) => !string.IsNullOrEmpty(s) ? s : null;

        internal static string? NameSuffix(this TypeKind? kind)
        {
            switch (kind)
            {
                default:
                case null:
                case TypeKind.GenericParameter: return null;
                case TypeKind.Array: return "[]";
                case TypeKind.Pointer: return "*";
                case TypeKind.ByReference: return "&";
            }
        }
    }
}
