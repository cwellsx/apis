using System.Linq;
using System.Collections.Generic;

namespace Core
{
    static class StringExtensions
    {
        internal static string AsString(this MethodMember method, bool isShort = true)
        {
            var access = method.Access.AsString() + " ";
            var returnType = method.IsConstructor == true
                ? string.Empty
                : method.ReturnType.AsString(isShort) + " ";
            return access
                + returnType
                + method.Name
                + (method.GenericArguments == null ? string.Empty : method.GenericArguments.AsString(isShort))
                + (method.Parameters == null ? "()" : method.Parameters.AsString(isShort));
        }

        internal static string AsString(this TypeId typeId, bool isShort = true)
        {
            if (isShort && (typeId.Namespace == "System"))
            {
                switch (typeId.Name)
                {
                    case "Void": return "void";
                    case "String": return "string";
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

        internal static string AsString(this IEnumerable<TypeId> genericTypeArguments, bool isShort) =>
            $"<{string.Join(", ", genericTypeArguments.Select(t => t.AsString(isShort)))}>";

        internal static string AsString(this Values<Parameter> parameters, bool isShort) =>
            $"({string.Join(", ", parameters.Select(p => p.AsString(isShort)))})";

        internal static string AsString(this Parameter parameter, bool isShort) =>
            parameter.Type.AsString(isShort) +
            (string.IsNullOrEmpty(parameter.Name) ? string.Empty : " " + parameter.Name);

        internal static string AsString(this Access access)
        {
            switch (access)
            {
                case Access.None: return "";
                case Access.Public: return "public";
                case Access.ProtectedInternal: return "protected internal";
                case Access.Protected: return "protected";
                case Access.Internal: return "internal";
                case Access.PrivateProtected: return "private protected";
                case Access.Private: return "private";
                default: return "access";
            }
        }
    }
}
