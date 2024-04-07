using System.Collections.Generic;
using System.Linq;

namespace Core
{
    static class StringExtensions
    {
        internal static string AsString(this MethodMemberEx method, Values<TypeIdEx>? genericMethodArguments, bool isShort = true)
            => AsString(method, genericMethodArguments?.AsString(isShort), isShort);

        internal static string AsString(this MethodMemberEx method, Values<TypeId>? genericMethodParameters, bool isShort = true)
            => AsString(method, genericMethodParameters?.AsString(), isShort);

        static string AsString(MethodMemberEx method, string? generic, bool isShort)
        {
            var access = method.Access.AsString() + " ";
            var returnType = method.IsConstructor == true
                ? string.Empty
                : method.ReturnType.AsString(isShort) + " ";
            return access
                + returnType
                + method.Name
                + generic
                + (method.Parameters == null ? "()" : method.Parameters.AsString(isShort));
        }

        internal static string AsString(this TypeIdEx typeId, bool isShort = true)
        {
            if (typeId.Namespace == "System")
            {
                switch (typeId.Name)
                {
                    case "Void": return "void";
                    case "String": return "string";
                    case "Int32": return "int";
                    case "Object": return "object";
                    // there are more of these, e.g. long and char etc., see https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/built-in-types
                }
            }
            var prefix =
                (typeId.Kind == TypeKind.GenericParameter)
                ? string.Empty
                : (typeId.DeclaringType != null)
                ? typeId.DeclaringType.AsString(isShort) + "+"
                : (!isShort)
                ? typeId.Namespace + "." // ignore AssemblyName even if not short?
                : string.Empty;

            var name = typeId.Name;

            if (typeId.GenericTypeArguments != null)
            {
                var index = typeId.Name.LastIndexOf("`");
                if (index != -1)
                {
                    name = name.Substring(0, index);
                }
                name += typeId.GenericTypeArguments.AsString(isShort);
            }

            return prefix + name;
        }

        static string AsString(this IEnumerable<TypeIdEx> genericArguments, bool isShort) =>
            $"<{string.Join(", ", genericArguments.Select(t => t.AsString(isShort)))}>";

        static string AsString(this IEnumerable<TypeId> genericParameters) =>
            $"<{string.Join(", ", genericParameters.Select(t => t.Name))}>";

        static string AsString(this Values<ParameterEx> parameters, bool isShort) =>
            $"({string.Join(", ", parameters.Select(p => p.AsString(isShort)))})";

        static string AsString(this ParameterEx parameter, bool isShort) =>
            parameter.Type.AsString(isShort) +
            (string.IsNullOrEmpty(parameter.Name) ? string.Empty : " " + parameter.Name);

        static string AsString(this Access access)
        {
            switch (access)
            {
                case Access.None: return string.Empty;
                case Access.Public: return "public";
                case Access.ProtectedInternal: return "protected internal";
                case Access.Protected: return "protected";
                case Access.Internal: return "internal";
                case Access.PrivateProtected: return "private protected";
                case Access.Private: return "private";
                default: return "access";
            }
        }

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
