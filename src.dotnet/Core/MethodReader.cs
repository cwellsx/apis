using System;
using System.Collections.Generic;
using System.Linq;

/*
 * The functions of this class are:
 * 
 * - Use and encapsulate the Decompiler class
 * - Catch any exceptions it may throw
 * - Convert its Result data to TypeId etc.
 * 
 * The output from this class is consumed by MethodFinder.
 */

namespace Core
{
    using MethodsDictionary = Dictionary<MethodMember, MethodReader.Decompiled>;
    using TypesDictionary = Dictionary<TypeId, TypeMethods>;

    public record TypeMethods(TypeId[]? GenericTypeParameters, MethodsDictionary MethodsDictionary);

    public class MethodReader
    {
        public record MethodId(MethodMember methodMember, TypeId declaringType);

        public record Decompiled(string AsText, MethodId[] Calls, int MetadataToken);

        internal Func<string, bool> IsMicrosoftAssemblyName { get; }

        public Dictionary<string, TypesDictionary> Dictionary { get; } = new Dictionary<string, TypesDictionary>();
        public List<Error> Errors { get; } = new List<Error>();

        internal MethodReader(Func<string, bool> isMicrosoftAssemblyName)
        {
            IsMicrosoftAssemblyName = isMicrosoftAssemblyName;
        }

        internal void Add(string assemblyName, string path, AssemblyInfo assemblyInfo)
        {
            var typesDictionary = new TypesDictionary();
            Dictionary.Add(assemblyName, typesDictionary);
            var decompiler = new Core.IL.Decompiler(path);
            foreach (var typeInfo in assemblyInfo.Types)
            {
                if (typeInfo.TypeId == null || typeInfo.Members?.MethodMembers == null)
                {
                    continue;
                }
                var methodsDictionary = new MethodsDictionary();
                var typeMethods = new TypeMethods(typeInfo.GenericTypeParameters, methodsDictionary);
                typesDictionary.Add(typeInfo.TypeId, typeMethods);
                foreach (var methodMember in typeInfo.Members.MethodMembers)
                {
                    var (asText, calls) = decompiler.Decompile(methodMember.MetadataToken);
                    var key = new MethodMember(
                        methodMember.Name,
                        methodMember.Access,
                        methodMember.Parameters,
                        methodMember.IsStatic,
                        methodMember.IsConstructor,
                        methodMember.GenericArguments,
                        methodMember.ReturnType
                        ).Simplify(IsMicrosoftAssemblyName);
                    var value = new Decompiled(
                        asText,
                        calls.Select(call => call.Transform(IsMicrosoftAssemblyName)).ToArray(),
                        methodMember.MetadataToken
                        );
                    methodsDictionary.Add(key, value);
                }
            }
        }

        internal void Verify(Dictionary<string, AssemblyInfo> assemblies)
        {
            // assrt that the top level only contains generic type declarations, not specializations
            // specializations are found as types of field, property, paramater, return type, and base type
            foreach (var assemblyInfo in assemblies.Values)
            {
                foreach (var typeInfo in assemblyInfo.Types)
                {
                    var typeId = typeInfo.TypeId;
                    if (typeId == null)
                    {
                        continue;
                    }
                    Assert(typeId.GenericTypeArguments == null, "Generic arguments", typeInfo);
                    Assert(typeId.AssemblyName != null, "Type assembly name", typeInfo);
                    Assert((typeId.ElementType != null) == (typeId.Kind.NameSuffix() != null), "Type element type", typeInfo);
                    if (typeId.ElementType != null)
                    {
                        Assert((typeId.Name == typeId.ElementType.Name + typeId.Kind.NameSuffix()), "Type element type", typeInfo);
                    }
                    var methodMembers = typeInfo.Members?.MethodMembers;
                    if (methodMembers != null)
                    {
                        foreach (var methodMember in methodMembers)
                        {
                            Assert(methodMember.ReturnType.AssemblyName != null, "ReturnType assembly name", typeInfo);
                        }
                    }
                }
            }
        }

        private bool Assert(bool b, string message, object extra, params object[] more)
        {
            if (!b)
            {
                // to debug this error, visually compare Core.json with Methods.json 
                Errors.Add(new Error(message, extra, more));
            }
            return b;
        }
    }
}
