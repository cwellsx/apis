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

        internal void Add(string assemblyName, string path, AssemblyInfo assemblyInfo, string? targetFramework)
        {
            var typeDictionary = new TypeDictionary();
            Dictionary.Add(assemblyName, typeDictionary);
            try
            {
                var decompiler = new Core.IL.Decompiler(path, targetFramework);
                Add(
                    typeDictionary,
                    assemblyInfo,
                    (methodMember, typeId) => GetDecompiled(methodMember, typeId, decompiler)
                    );
            }
            catch (Exception exception)
            {
                Add(
                    typeDictionary,
                    assemblyInfo,
                    (methodMember, typeId) => GetDecompiled(methodMember, typeId, exception)
                    );
                throw;
            }
        }

        private void Add(TypeDictionary typeDictionary, AssemblyInfo assemblyInfo, Func<MethodMember, TypeIdEx, Decompiled> decompile)
        {
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
                    var decompiled = decompile(methodMember, typeId);
                    listDecompiled.Add(decompiled);
                }
            }
        }

        Decompiled GetDecompiled(MethodMember methodMember, TypeIdEx typeId, Core.IL.Decompiler decompiler)
        {
            try
            {
                var methodMemberEx = new MethodMemberEx(methodMember, _isMicrosoftAssemblyName);
                var (asText, calls) = decompiler.Decompile(methodMember.MetadataToken);
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
                return decompiled;
            }
            catch (Exception exception)
            {
                return GetDecompiled(methodMember, typeId, exception);
            }
        }

        Decompiled GetDecompiled(MethodMember methodMember, TypeIdEx typeId, Exception exception)
        {
            var methodMemberEx = new MethodMemberEx(methodMember, _isMicrosoftAssemblyName);
            var methodDetails = new MethodDetails(
                methodMemberEx.AsString(methodMember.GenericArguments, false),
                typeId.AsString(false),
                exception
                );
            var decompiled = new Decompiled(
                methodDetails,
                Array.Empty<MethodId>(),
                methodMember.MetadataToken,
                methodMemberEx,
                methodMember.GenericArguments
                );
            return decompiled;
        }
    }
}
