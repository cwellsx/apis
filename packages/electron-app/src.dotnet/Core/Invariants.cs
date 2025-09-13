using Core.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.Output.Public
{
    static class Invariants
    {
        record Pair(TypeId TypeId, object member);

        internal static void Verify(TypeInfo[] types)
        {
            VerifyTypes(types);
            VerifyMetadataTokens(types);
        }

        static void VerifyMetadataTokens(TypeInfo[] types)
        {
            Dictionary<int, object> metadataTokens = new Dictionary<int, object>();
            Dictionary<object, int> objectsWithIds = new Dictionary<object, int>();

            void assertMetadataToken(int metadataToken, object o, object o2)
            {
                if (!metadataTokens.TryGetValue(metadataToken, out var value))
                {
                    metadataTokens.Add(metadataToken, o);
                    objectsWithIds.Add(o2, metadataToken);
                }
                else
                {
                    if (o != value)
                    {
                        throw new Exception("MetadataToken in not unique");
                    }
                    if (metadataToken != objectsWithIds[o2])
                    {
                        throw new Exception("MetadataToken in not consistent");
                    }
                }
            }

            foreach (var typeInfo in types)
            {
                if (typeInfo.TypeId == null)
                {
                    continue;
                }

                assertMetadataToken(typeInfo.TypeId.MetadataToken, typeInfo.TypeId, typeInfo.TypeId with { MetadataToken = 0 });
                foreach (var fieldMember in typeInfo.Members?.FieldMembers ?? Array.Empty<FieldMember>())
                {
                    assertMetadataToken(fieldMember.MetadataToken, fieldMember, new Pair(
                        typeInfo.TypeId with { MetadataToken = 0 },
                        fieldMember with { MetadataToken = 0 }
                        ));
                }
                foreach (var eventMember in typeInfo.Members?.EventMembers ?? Array.Empty<EventMember>())
                {
                    assertMetadataToken(eventMember.MetadataToken, eventMember, new Pair(
                        typeInfo.TypeId with { MetadataToken = 0 },
                        eventMember with { MetadataToken = 0 }
                        ));
                }
                foreach (var propertyMember in typeInfo.Members?.PropertyMembers ?? Array.Empty<PropertyMember>())
                {
                    assertMetadataToken(propertyMember.MetadataToken, propertyMember, new Pair(
                        typeInfo.TypeId with { MetadataToken = 0 },
                        propertyMember with { MetadataToken = 0 }
                        ));
                }
                foreach (var methodMember in typeInfo.Members?.MethodMembers ?? Array.Empty<MethodMember>())
                {
                    assertMetadataToken(methodMember.MetadataToken, methodMember, new Pair(
                        typeInfo.TypeId with { MetadataToken = 0 },
                        methodMember with { MetadataToken = 0 }
                        ));
                }
            }
        }

        static void VerifyTypes(TypeInfo[] types)
        {
            foreach (var typeInfo in types)
            {
                if (typeInfo.TypeId == null && typeInfo.Exceptions == null)
                {
                    typeInfo.AddMessage("TypeInfo");
                }
            }
            var all = types.Where(type => type.TypeId != null).ToDictionary(type => type.TypeId!);
            foreach (var (typeId, typeInfo) in all.Select(kvp => (kvp.Key, kvp.Value)))
            {
                Func<Flag, bool> hasFlag = (flag) => typeInfo.Flag.HasValue && ((typeInfo.Flag.Value & flag) == flag);
                Action<bool, string> assert = (b, message) =>
                {
                    if (!b)
                    {
                        typeInfo.AddMessage(message);
                    }
                };
                var index = typeId.Name.IndexOf("`");
                int? n = index == -1 ? null : int.Parse(typeId.Name.Substring(index + 1));
                if (n.HasValue)
                {
                    assert(hasFlag(Flag.Generic), "Generic name");
                    var args = hasFlag(Flag.GenericDefinition) ? typeInfo.GenericTypeParameters : typeId.GenericTypeArguments;
                    assert(n == (args?.Length) || (n.HasValue && args != null && n.Value <= args.Length), "Generic arguments");
                }
                else if (hasFlag(Flag.Generic))
                {
                    var args = hasFlag(Flag.GenericDefinition) ? typeInfo.GenericTypeParameters : typeId.GenericTypeArguments;
                    assert(args != null, "Generic arguments");
                }
                assert(hasFlag(Flag.Nested) == (typeId.DeclaringType != null), "Nested");
                if (typeId.DeclaringType != null)
                {
                    assert(all.ContainsKey(typeId.DeclaringType), "Declaring type");
                }

                if (typeInfo.Attributes != null)
                {
                    assert(typeInfo.Attributes.Distinct().Count() == typeInfo.Attributes.Length, "Unique attributes");
                }

                assert(typeId.GenericTypeArguments == null, "Generic arguments");
                assert(typeId.AssemblyName != null, "Type assembly name");
                assert((typeId.ElementType != null) == (typeId.Kind.NameSuffix() != null), "Type element type");
                if (typeId.ElementType != null)
                {
                    assert((typeId.Name == typeId.ElementType.Name + typeId.Kind.NameSuffix()), "Type element type");
                }
                var methodMembers = typeInfo.Members?.MethodMembers;
                if (methodMembers != null)
                {
                    foreach (var methodMember in methodMembers)
                    {
                        assert(methodMember.ReturnType.AssemblyName != null, "ReturnType assembly name");
                    }
                }
            }
        }
    }
}
