using ICSharpCode.Decompiler.CSharp.Syntax;
using Mono.Cecil;
using System.Linq;
using System.Text.RegularExpressions;

namespace Core.Cecil
{
    internal static class Predicates
    {
        // this is the only compiler-generated type that isn't wholly-owned by a single user methods
        // instead each of its methods is owned by various user methods
        //internal static bool IsLambdaCache(this TypeDefinition typeDefinition) => typeDefinition.Name == "<>c";
        private static readonly Regex LambdaCachePattern = new(@"^<>c(__\d+)?(`\d+)?$", RegexOptions.Compiled);
        internal static bool IsLambdaCache(this TypeReference typeReference) => LambdaCachePattern.IsMatch(typeReference.Name);

        internal static bool IsCompilerGenerated(this TypeDefinition typeDefinition) =>
            // most compiler-generated types have this attribute
            typeDefinition.CustomAttributes.Any(ca => ca.AttributeType.FullName == "System.Runtime.CompilerServices.CompilerGeneratedAttribute") ||
            // nested types might be compiler-generated even if the attribute is on the parent type
            (typeDefinition.DeclaringType != null && IsCompilerGenerated(typeDefinition.DeclaringType)) ||
            // maybe the IteratorInsideLocalExample example needs this
            typeDefinition.Name.StartsWith("<");

        // used in CompilerMethods to filter types whose methods are resolved
        internal static bool IsSignificantCompilerGenerated(this TypeDefinition typeDefinition) =>
            typeDefinition.IsCompilerGenerated() &&
            typeDefinition.IsSignificant();

        private static bool IsInsignificantCompilerGenerated(this TypeDefinition typeDefinition) =>
            typeDefinition.IsCompilerGenerated() &&
            !typeDefinition.IsSignificant();

        internal static bool IsInsignificantCompilerGenerated(this MethodDefinition methodDefinition) =>
            methodDefinition.DeclaringType.IsInsignificantCompilerGenerated() ||
            methodDefinition.IsLambdaCacheStaticCtor() ||
            methodDefinition.IsLambdaCacheCtor();

        private static bool IsSignificant(this TypeDefinition typeDefinition) =>
            typeDefinition.HasMethods &&
            // ignore e.g. "Microsoft.CodeAnalysis.EmbeddedAttribute
            typeDefinition.BaseType.FullName != "System.Attribute" &&
            !typeDefinition.FullName.StartsWith("<PrivateImplementationDetails>") &&
            !typeDefinition.FullName.StartsWith("<>f__AnonymousType");

        internal static bool IsLambdaCacheStaticCtor(this MethodDefinition methodDefinition) => methodDefinition.Name == ".cctor" && methodDefinition.DeclaringType.IsLambdaCache();
        internal static bool IsLambdaCacheCtor(this MethodDefinition methodDefinition) => methodDefinition.Name == ".ctor" && methodDefinition.DeclaringType.IsLambdaCache();

        internal static bool IsConstructor(this MethodReference methodReference) => methodReference.Name == ".ctor" || methodReference.Name == ".cctor";

        internal static bool IsModuleType(Mono.Cecil.TypeDefinition type) => type.Name == "<Module>" && type.Namespace == "";

    }
}
