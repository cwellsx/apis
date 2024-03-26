using System.Collections.Generic;
using System.Linq;
using Core.IL.Output;
using ICSharpCode.Decompiler.TypeSystem;
using ICSharpCode.Decompiler.TypeSystem.Implementation;

namespace Core.IL
{
    internal static class Extensions
    {
        internal static Method[] Transform(this IEnumerable<IMethod> methods)
        {
            return methods.Select(Transform).ToArray();
        }

        static Method Transform(IMethod method)
        {
            //if (method.Name == "<GetProperty>g__Get|23_0" && method.DeclaringType.Name == "TypeReader")
            //{
            //    Console.WriteLine("found");
            //    var foo = method.ReturnType.Transform();
            //}
            //method.MetadataToken;
            return new Method(
                method.Name,
                method.Parameters.Select(parameter => (parameter.Name, parameter.Type.Transform())).ToArrayOrNull(),
                method.TypeArguments.Select(Transform).ToArrayOrNull(),
                method.ReturnType.Transform(),
                method.IsStatic,
                method.IsConstructor,
                method.DeclaringType.Transform(),
                GetAttributes(method.GetAttributes()),
                (Core.IL.Output.Accessibility)method.Accessibility
               );
        }

        static TypeId Transform(this IType type)
        {
            bool isElementType = (type as TypeWithElementType)?.ElementType != null;
            var elementType = (type as TypeWithElementType)?.ElementType ?? type;
            bool isTupleType = (elementType as TupleType)?.UnderlyingType != null;
            elementType = (elementType as TupleType)?.UnderlyingType ?? elementType;
            var nameSuffix = (type as TypeWithElementType)?.NameSuffix ?? string.Empty;
            var assemblyName = elementType.GetDefinition()?.ParentModule?.AssemblyName;
            // want a name like "KeyValuePair`2[]" (i.e. with generic arity appended) and not just "KeyValuePair[]"
            var name = elementType.GetDefinition()?.MetadataName ?? elementType.Name;
            // we have the name of the element not the type, so add the suffix
            name += nameSuffix;
            // get the type arguments from UnderlyingType but not from ElementType
            var typeArguments = (isTupleType && !isElementType) ? elementType.TypeArguments : type.TypeArguments;

            return new TypeId(
                assemblyName,
                elementType.Namespace == string.Empty ? null : type.Namespace,
                name,
                typeArguments.Select(Transform).ToArrayOrNull(),
                type.DeclaringType?.Transform(),
                Kind: ((type as AbstractType)?.Kind).Transform(),
                ElementType: (type as TypeWithElementType)?.ElementType?.Transform()
               );
        }

        static Kind? Transform(this TypeKind? typeKind)
        {
            switch (typeKind)
            {
                default:
                case null: return null;
                case TypeKind.Array: return Kind.Array;
                case TypeKind.Pointer: return Kind.Pointer;
                case TypeKind.ByReference: return Kind.ByReference;
            }
        }

        static T[]? ToArrayOrNull<T>(this IEnumerable<T> enumerable)
        {
            var array = enumerable.ToArray();
            return array.Length > 0 ? array : null;
        }

        static string[]? GetAttributes(IEnumerable<IAttribute> attributes)
        {
            return (!attributes.Any()) ? null : attributes.Select(attribute =>
            {
                var name = attribute.AttributeType.FullName;
                var constructorArguments = attribute.FixedArguments.Select(arg => arg.ToString());
                var namedArguments = attribute.NamedArguments.Select(arg => arg.ToString());
                var args = constructorArguments.Concat(namedArguments).ToArray();
                return (args.Length != 0) ? $"[{name}({string.Join(", ", args)})]" : $"[{name}]";
            }).ToArray();
        }
    }
}
