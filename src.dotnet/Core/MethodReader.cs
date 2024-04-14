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
    using ListDecompiled = List<Decompiled>;
    using TypeDictionary = Dictionary<TypeIdEx, TypeMethods>;

    internal record TypeMethods(TypeId[]? GenericTypeParameters, ListDecompiled ListDecompiled);

    public class MethodReader
    {
        Func<string, bool> _isMicrosoftAssemblyName;

        internal Dictionary<string, TypeDictionary> Dictionary { get; } = new Dictionary<string, TypeDictionary>();

        internal MethodReader(Func<string, bool> isMicrosoftAssemblyName)
        {
            _isMicrosoftAssemblyName = isMicrosoftAssemblyName;
        }

        internal void Add(string assemblyName, string path, AssemblyInfo assemblyInfo)
        {
            var typeDictionary = new TypeDictionary();
            Dictionary.Add(assemblyName, typeDictionary);
            var decompiler = new Core.IL.Decompiler(path);
            foreach (var typeInfo in assemblyInfo.Types)
            {
                if (typeInfo.TypeId == null || typeInfo.Members?.MethodMembers == null)
                {
                    continue;
                }
                var listDecompiled = new ListDecompiled();
                var typeMethods = new TypeMethods(typeInfo.GenericTypeParameters, listDecompiled);
                var typeId = new TypeIdEx(typeInfo.TypeId, _isMicrosoftAssemblyName);
                typeDictionary.Add(typeId, typeMethods);
                foreach (var methodMember in typeInfo.Members.MethodMembers)
                {
                    var (asText, calls) = decompiler.Decompile(methodMember.MetadataToken);
                    var methodMemberEx = new MethodMemberEx(methodMember, _isMicrosoftAssemblyName);
                    var methodDetails = new MethodDetails(
                        asText,
                        methodMemberEx.AsString(methodMember.GenericArguments, false),
                        typeId.AsString(false)
                        );
                    var decompiled = new Decompiled(
                        methodDetails,
                        calls.Select(call => call.Transform(_isMicrosoftAssemblyName)).ToArray(),
                        methodMember.MetadataToken,
                        methodMemberEx,
                        methodMember.GenericArguments
                        );
                    listDecompiled.Add(decompiled);
                }
            }
        }
    }
}
