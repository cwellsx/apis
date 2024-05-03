using Core.IL.Output;
using ICSharpCode.Decompiler.TypeSystem;
using ICSharpCode.Decompiler.TypeSystem.Implementation;
using System.Collections.Generic;
using System.Linq;

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
            var declaringType = method.DeclaringType.Transform();
            var assemblyName = declaringType.AssemblyName;
            return new Method(
                method.Name,
                method.Parameters.Select(parameter => (parameter.Name, parameter.Type.Transform(assemblyName))).ToArrayOrNull(),
                method.TypeArguments.Select(arg => arg.Transform(assemblyName)).ToArrayOrNull(),
                method.ReturnType.Transform(assemblyName),
                method.IsStatic,
                method.IsConstructor,
                declaringType,
                GetAttributes(method.GetAttributes()),
                (Core.IL.Output.Accessibility)method.Accessibility
               );
        }

        static TypeId Transform(this IType type, string? declaringAssemblyName = null)
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

            // type parameter may not define assembly name
            var typeParameter = elementType as AbstractTypeParameter;
            if (assemblyName == null && typeParameter != null)
            {
                assemblyName = typeParameter.Compilation.MainModule.AssemblyName;
            }

            var elementTypeTransformed = (type as TypeWithElementType)?.ElementType?.Transform();
            // this recursion is needed e.g. when type a reference to an array of elements i.e. a doubly-nested element
            if (assemblyName == null && elementTypeTransformed != null)
            {
                assemblyName = elementTypeTransformed.AssemblyName;
            }

            if (type.Kind == TypeKind.TypeParameter)
            {
                assemblyName ??= declaringAssemblyName;
            }

            var @namespace = elementType.Namespace == string.Empty ? null : type.Namespace;

            return new TypeId(
                assemblyName.NotNull(@namespace, name),
                @namespace,
                name,
                typeArguments.Select(arg => arg.Transform(declaringAssemblyName)).ToArrayOrNull(),
                type.DeclaringType?.Transform(),
                Kind: type.Kind.Transform(),
                ElementType: elementTypeTransformed
               );
        }

        internal static string NotNull(this string? assemblyName, string? @namespace, string name)
        {
            if (assemblyName == null)
            {
                throw new System.ArgumentNullException("assemblyName", $"Core.Il type {@namespace}.{name}");
            }
            return assemblyName;
        }

        static Kind? Transform(this TypeKind typeKind)
        {
            switch (typeKind)
            {
                default: return null;
                case TypeKind.TypeParameter: return Kind.GenericParameter;
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
