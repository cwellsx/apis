using Mono.Cecil;
using System.Linq;
using System.Text.RegularExpressions;

namespace Core.Cecil
{
    internal static class Predicates
    {
        // this is the only compiler-generated type that isn't wholly-owned by a single user methods
        // instead each of its methods is owned by various user methods
        private static readonly Regex LambdaCachePattern = new(@"^<>c(__\d+)?(`\d+)?$", RegexOptions.Compiled);
        internal static bool IsLambdaCache(this TypeReference typeReference) => LambdaCachePattern.IsMatch(typeReference.Name);

        // this is strange because it's a compiler-defined method added to a user-defined type
        private static readonly Regex LocalFunctionPattern = new(@"^<[^>]+>g__.*\d+_\d+$", RegexOptions.Compiled);
        internal static bool IsLocalFunction(this MethodDefinition methodDefinition) =>
            !methodDefinition.DeclaringType.IsCompilerGenerated() &&
            methodDefinition.CustomAttributes.IsCompilerGenerated() &&
            LocalFunctionPattern.IsMatch(methodDefinition.Name);

        // this is strange because its methods aren't called from anywhere
        private static readonly Regex FixedBufferPattern = new(@"^<[^>]+>e__FixedBuffer$", RegexOptions.Compiled);
        internal static bool IsFixedBuffer(this TypeDefinition typeDefinition) => FixedBufferPattern.IsMatch(typeDefinition.Name);

        //

        internal static string AssemblyName(this TypeDefinition typeDefinition) => typeDefinition.Module.Assembly.Name.Name;
        internal static string ReferencedAssemblyName(this TypeReference typeReference) => GetReferencedAssembly(typeReference)?.Name ?? "?";

        private static AssemblyNameReference? GetReferencedAssembly(TypeReference typeReference)
        {
            var scope = typeReference.Scope;

            while (true)
            {
                switch (scope)
                {
                    case AssemblyNameReference anr:
                        return anr;

                    case ModuleDefinition modDef:
                        return modDef.Assembly.Name;

                    case TypeReference tr:
                        // TypeSpec wrappers (ArrayType, GenericInstanceType, etc.)
                        scope = tr.Scope;
                        continue;

                    case ModuleReference modRef: // when it's P/Invoke or similar then there's no assembly
                    default:
                        Logger.Log($"Unexpected scope type: {scope.GetType().FullName}");
                        return null;
                }
            }
        }

        internal static bool IsCompilerGenerated(this Mono.Collections.Generic.Collection<CustomAttribute> customAttributes) =>
            customAttributes
            .Any(ca => ca.AttributeType.FullName == "System.Runtime.CompilerServices.CompilerGeneratedAttribute");

        internal static bool IsCompilerGenerated(this TypeDefinition typeDefinition) =>
            // most compiler-generated types have this attribute
            typeDefinition.CustomAttributes.IsCompilerGenerated() ||
            // nested types might be compiler-generated even if the attribute is on the parent type
            (typeDefinition.DeclaringType != null && IsCompilerGenerated(typeDefinition.DeclaringType)) ||
            // maybe the IteratorInsideLocalExample example needs this
            typeDefinition.Name.StartsWith("<");

        internal static bool IsSynthetic(this MethodReference mr)
        {
            var dt = mr.DeclaringType;

            return dt.IsArray
                || dt.IsPointer
                || dt.IsByReference
                || dt is FunctionPointerType
                || dt is GenericParameter
                //|| dt.ContainsGenericParameter
                || mr.CallingConvention == MethodCallingConvention.VarArg
                ;
        }

        // used in CompilerMethods to filter types whose methods are resolved
        internal static bool IsSignificantCompilerGenerated(this TypeDefinition typeDefinition) =>
            typeDefinition.IsCompilerGenerated() &&
            typeDefinition.IsSignificant();

        internal static bool IsInsignificantCompilerGenerated(this TypeDefinition typeDefinition) =>
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
            !typeDefinition.FullName.StartsWith("<>f__AnonymousType") &&
            !typeDefinition.IsFixedBuffer();

        internal static bool IsLambdaCacheStaticCtor(this MethodDefinition methodDefinition) => methodDefinition.Name == ".cctor" && methodDefinition.DeclaringType.IsLambdaCache();
        internal static bool IsLambdaCacheCtor(this MethodDefinition methodDefinition) => methodDefinition.Name == ".ctor" && methodDefinition.DeclaringType.IsLambdaCache();

        internal static bool IsConstructor(this MethodReference methodReference) => methodReference.Name == ".ctor" || methodReference.Name == ".cctor";

        internal static bool IsModuleType(Mono.Cecil.TypeDefinition type) => type.Name == "<Module>" && type.Namespace == "";

    }
}
