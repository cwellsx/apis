// This defines the output/return types, to insulate the caller from ICSharpCode types such as IType and IMethod

namespace Core.IL.Output
{
    public record Method(
        string Name,
        (string, TypeId)[]? Parameters,
        TypeId[]? GenericArguments,
        TypeId ReturnType,
        bool IsStatic,
        bool IsConstructor,
        TypeId DeclaringType,
        string[]? Attributes,
        Accessibility Accessibility
        );

    public enum Kind
    {
        None,
        GenericParameter,
        Array,
        Pointer,
        ByReference
    }

    public record TypeId(
        string? AssemblyName,
        string? Namespace,
        string Name,
        TypeId[]? GenericTypeArguments,
        TypeId? DeclaringType,
        Kind? Kind,
        TypeId? ElementType
    );

    public enum Accessibility
    {
        None = ICSharpCode.Decompiler.TypeSystem.Accessibility.None,
        Private = ICSharpCode.Decompiler.TypeSystem.Accessibility.Private,
        ProtectedAndInternal = ICSharpCode.Decompiler.TypeSystem.Accessibility.ProtectedAndInternal,
        Protected = ICSharpCode.Decompiler.TypeSystem.Accessibility.Protected,
        Internal = ICSharpCode.Decompiler.TypeSystem.Accessibility.Internal,
        ProtectedOrInternal = ICSharpCode.Decompiler.TypeSystem.Accessibility.ProtectedOrInternal,
        Public = ICSharpCode.Decompiler.TypeSystem.Accessibility.Public,
    }
}
