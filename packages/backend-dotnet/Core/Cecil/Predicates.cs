using Core.Output.Public;
using Mono.Cecil;
using System;
using System.Collections.Generic;
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

            var newTypeInfos = typeDefinitions.Select(CecilToOutput.TypeInfo.Transform).ToArray();
            var count = 0;
            foreach (var oldTypeInfo in typeInfos.Where(IsSignificant))
            {
                Logger.Log($"{count++} {oldTypeInfo.TypeId.Name}");

                var newTypeInfo = newTypeInfos.Single(typeInfo =>
                    typeInfo.TypeId.Name == oldTypeInfo.TypeId.Name &&
                    (string.IsNullOrEmpty(typeInfo.TypeId.Namespace) ||
                    typeInfo.TypeId.Namespace == oldTypeInfo.TypeId.Namespace) &&
                    typeInfo.TypeId.DeclaringType?.Name == oldTypeInfo.TypeId.DeclaringType?.Name
                    );

                Hack(newTypeInfo.TypeId, oldTypeInfo.TypeId);
                HackIf(newTypeInfo.BaseType, oldTypeInfo.BaseType);

                if (newTypeInfo.TypeId != oldTypeInfo.TypeId)
                {
                    throw new Exception();
                }

                AssertSequenceEqual(newTypeInfo.Attributes, oldTypeInfo.Attributes);
                if (newTypeInfo.BaseType != oldTypeInfo.BaseType)
                { 
                    throw new Exception();
                }
                //AssertSequenceEqual(newTypeInfo.Interfaces, oldTypeInfo.Interfaces);
                AssertSequenceEqual(newTypeInfo.GenericTypeParameters, oldTypeInfo.GenericTypeParameters);

                AssertArraysEqual(newTypeInfo.Members.EventMembers, oldTypeInfo.Members.EventMembers);
                if (!oldTypeInfo.TypeId.Name.StartsWith("<"))
                {
                    Sort(newTypeInfo.Members.FieldMembers);
                    Sort(oldTypeInfo.Members.FieldMembers);
                    AssertArraysEqual(newTypeInfo.Members.FieldMembers, oldTypeInfo.Members.FieldMembers);
                }
                Sort(newTypeInfo.Members.MethodMembers);
                Sort(oldTypeInfo.Members.MethodMembers);
                AssertMembersEqual(newTypeInfo.Members.MethodMembers, oldTypeInfo.Members.MethodMembers);
                Sort(newTypeInfo.Members.PropertyMembers);
                Sort(oldTypeInfo.Members.PropertyMembers);
                AssertMembersEqual(newTypeInfo.Members.PropertyMembers, oldTypeInfo.Members.PropertyMembers);
                AssertArraysEqual(newTypeInfo.Members.TypeMembers, oldTypeInfo.Members.TypeMembers);
            }
        }

        static void Sort(FieldMember[]? fieldMembers)
        {
            if (fieldMembers != null)
            {
                Array.Sort(fieldMembers, (a, b) => a.Name.CompareTo(b.Name));
                foreach (var fieldMember in fieldMembers)
                {
                    fieldMember.Attributes = null;
                }
            }
        }

        static void Sort(MethodMember[]? methodMembers)
        {
            if (methodMembers != null)
            {
                Array.Sort(methodMembers, (a, b) =>
                {
                    var result = a.Name.CompareTo(b.Name);
                    if (result != 0)
                    {
                        return result;
                    }
                    if (a.Parameters == null)
                    {
                        return (b.Parameters == null) ? 0 : -1;
                    }
                    if (b.Parameters == null)
                    {
                        return 1;
                    }
                    result = a.Parameters.Length.CompareTo(b.Parameters.Length);
                    if (result != 0)
                    {
                        return result;
                    }
                    for (var i = 0; i < a.Parameters.Length; i++)
                    {
                        result = a.Parameters[i].Type.Name.CompareTo(b.Parameters[i].Type.Name);
                        if (result != 0)
                        {
                            return result;
                        }
                    }
                    return 0;
                });
                foreach (var methodMember in methodMembers)
                {
                    methodMember.IsConstructor = false;
                    methodMember.Attributes = null;
                }
            }
        }

        static void Sort(PropertyMember[]? members)
        {
            if (members != null)
            {
                Array.Sort(members, (a, b) => a.Name.CompareTo(b.Name));
                foreach (var member in members)
                {
                    member.Attributes = null;
                }
            }
        }

        static void AssertMembersEqual(PropertyMember[]? a, PropertyMember[]? b)
        {
            if (a == null || b == null)
            {
                if (a != b)
                {
                    throw new Exception();
                }
                return;
            }
            for (var i = 0; i < a.Length; i++)
            {
                var newMember = a[i];
                var oldMember = b[i];
                if (!newMember.Equals(oldMember))
                {
                    throw new Exception();
                }
            }
        }

        static void AssertMembersEqual(MethodMember[]? a, MethodMember[]? b)
        {
            if (a == null || b == null)
            {
                if (a != b)
                {
                    throw new Exception();
                }
                return;
            }
            for (var i = 0; i < a.Length; i++)
            {
                var newMember = a[i];
                var oldMember = b[i];
                if (!newMember.Equals(oldMember))
                {
                    throw new Exception();
                }
            }
        }

        static void AssertArraysEqual<T>(T[]? a, T[]? b)
        {
            if (a == null || b == null)
            {
                if (a != b)
                {
                    throw new Exception();
                }
                return;
            }
            for (var i = 0; i < a.Length; i++)
            {
                if (!a[i]!.Equals(b[i]))
                {
                    throw new Exception();
                }
            }
        }

        static void AssertSequenceEqual<T>(IEnumerable<T>? a, IEnumerable<T>? b)
        {
            if (a == null || b == null)
            {
                if (a != b)
                {
                    throw new Exception();
                }
                return;
            }
            if (!a.SequenceEqual(b))
            {
                throw new Exception();
            }
        }

        static void HackIf(Output.Public.TypeId? newTypeId, Output.Public.TypeId? oldTypeId)
        {
            if (newTypeId == null)
            {
                if (oldTypeId != null)
                {
                    throw new Exception();
                }
                return;
            }
            Hack(newTypeId!, oldTypeId!);
        }

        static void Hack(Output.Public.TypeId newTypeId, Output.Public.TypeId oldTypeId)
        {
            if (newTypeId.Name.StartsWith("<") || newTypeId.DeclaringType != null)
            {
                newTypeId.Namespace = null;
                oldTypeId.Namespace = null;
            }
            HackIf(newTypeId.DeclaringType, oldTypeId.DeclaringType);
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

        internal static bool IsSignificant(this Output.Public.TypeInfo typeInfo) =>
            // maybe some types like Foo/<>O which have no methods and aren't used at runtime
            //typeInfo.Members.MethodMembers != null.HasMethods &&
            // ignore e.g. "Microsoft.CodeAnalysis.EmbeddedAttribute
            typeInfo.BaseType?.Name != "System.Attribute" &&
            !typeInfo.TypeId.Name.StartsWith("<PrivateImplementationDetails>") &&
            (!typeInfo.TypeId.DeclaringType?.Name.StartsWith("<PrivateImplementationDetails>") ?? false);

        internal static bool IsConstructor(this MethodDefinition methodDefinition) => methodDefinition.Name == ".ctor" || methodDefinition.Name == ".cctor";
    }
}
