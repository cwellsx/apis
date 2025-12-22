using Mono.Cecil;
using System;
using System.Linq;
using System.Text.RegularExpressions;

namespace Core.Cecil
{
    internal static class Predicates
    {
        internal static void ValidateTypes(Output.Public.TypeInfo[] typeInfos, TypeDefinition[] typeDefinitions)
        {
            if (typeInfos.Length != typeDefinitions.Length)
            {
                throw new Exception($"Type count mismatch: {typeInfos.Length} != {typeDefinitions.Length}");
            }

            var typeInfoIds = typeInfos.Select(typeInfo => typeInfo.TypeId.MetadataToken).ToHashSet();
            var typeDefinitionIds = typeDefinitions.Select(typeDefinition => typeDefinition.MetadataToken.ToInt32()).ToHashSet();

            if (!typeInfoIds.SetEquals(typeDefinitionIds))
            {
                throw new Exception("Type metadata token mismatch");
            }

            Logger.Log($"Types: {typeInfos.Length}");
        }

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

        internal static bool IsSignificantCompilerGenerated(this TypeDefinition typeDefinition) =>
            typeDefinition.IsCompilerGenerated() &&
            // maybe some types like Foo/<>O which have no methods and aren't used at runtime
            typeDefinition.HasMethods &&
            // ignore e.g. "Microsoft.CodeAnalysis.EmbeddedAttribute
            typeDefinition.BaseType.FullName != "System.Attribute" &&
            !typeDefinition.FullName.StartsWith("<PrivateImplementationDetails>");

        internal static bool IsConstructor(this MethodDefinition methodDefinition) => methodDefinition.Name == ".ctor" || methodDefinition.Name == ".cctor";
    }
}
