using Core.Extensions;
using Core.Output.Internal;
using Core.Output.Public;
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
    using AssemblyDecompiled = Dictionary<TypeIdEx, TypeDecompiled>;

    internal static class MethodReader
    {
        internal static AssemblyDecompiled GetAssemblyDecompiled(
            string path,
            AssemblyInfo assemblyInfo,
            Func<string, bool> isMicrosoftAssemblyName,
            string? targetFramework)
        {
            HashSet<int> GetCompilerTypes(TypeInfo[] types)
            {
                var result = new HashSet<int>();
                var mapTypes = new Dictionary<int, TypeInfo>();
                foreach (var typeInfo in assemblyInfo.Types)
                {
                    if (typeInfo.TypeId == null || typeInfo.Members?.MethodMembers == null)
                    {
                        continue;
                    }
                    mapTypes.Add(typeInfo.TypeId.MetadataToken, typeInfo);
                }

                bool IsCompiler(TypeInfo typeInfo, Dictionary<int, TypeInfo> mapTypes)
                {
                    if (typeInfo.Attributes?.Any(attribute => attribute == "[System.Runtime.CompilerServices.CompilerGeneratedAttribute]") ?? false)
                    {
                        return true;
                    }
                    var declaringType = typeInfo.TypeId?.DeclaringType?.MetadataToken;
                    if (declaringType == null) return false;
                    mapTypes.TryGetValue(declaringType.Value, out var parent);
                    if (parent == null) return false;
                    return IsCompiler(parent, mapTypes); // <== recurse
                }

                foreach (var typeInfo in assemblyInfo.Types)
                {
                    if (IsCompiler(typeInfo, mapTypes))
                    {
                        result.Add(typeInfo.TypeId!.MetadataToken);
                    }
                }

                return result;
            }

            AssemblyDecompiled Get(Func<MethodMember, TypeIdEx, Decompiled> decompile)
            {
                var typeDictionary = new AssemblyDecompiled();

                var compilerTypes = GetCompilerTypes(assemblyInfo.Types);

                foreach (var typeInfo in assemblyInfo.Types)
                {
                    if (typeInfo.TypeId == null || typeInfo.Members?.MethodMembers == null)
                    {
                        continue;
                    }
                    var listDecompiled = new List<Decompiled>();
                    var typeMethods = new TypeDecompiled(typeInfo, listDecompiled, compilerTypes.Contains(typeInfo.TypeId.MetadataToken));
                    var typeId = new TypeIdEx(typeInfo.TypeId, isMicrosoftAssemblyName);
                    typeDictionary.Add(typeId, typeMethods);
                    foreach (var methodMember in typeInfo.Members.MethodMembers)
                    {
                        var decompiled = decompile(methodMember, typeId);
                        listDecompiled.Add(decompiled);
                    }
                }

                return typeDictionary;
            }

            Decompiled GetFromDecompiler(MethodMember methodMember, TypeIdEx typeId, Core.IL.Decompiler decompiler)
            {
                try
                {
                    var methodMemberEx = new MethodMemberEx(methodMember, isMicrosoftAssemblyName);
                    var (asText, calledMethods, arguedMethods, localsTypes) = decompiler.Decompile(methodMember.MetadataToken);
                    var methodDetails = new MethodDetails(
                        asText,
                        methodMemberEx.AsString(methodMember.GenericArguments, false),
                        typeId.AsString(false)
                        );
                    var decompiled = new Decompiled(
                        methodDetails,
                        calledMethods.Select(call => call.Transform(isMicrosoftAssemblyName)).ToArray(),
                        arguedMethods.Select(call => call.Transform(isMicrosoftAssemblyName)).ToArray(),
                        localsTypes.Select(localsType => new TypeIdEx(localsType.Transform(), isMicrosoftAssemblyName)).ToArray(),
                        methodMember.MetadataToken,
                        methodMemberEx,
                        methodMember.GenericArguments
                        );
                    return decompiled;
                }
                catch (Exception exception)
                {
                    return GetFromException(methodMember, typeId, exception);
                }
            }

            Decompiled GetFromException(MethodMember methodMember, TypeIdEx typeId, Exception exception)
            {
                var methodMemberEx = new MethodMemberEx(methodMember, isMicrosoftAssemblyName);
                var methodDetails = new MethodDetails(
                    methodMemberEx.AsString(methodMember.GenericArguments, false),
                    typeId.AsString(false),
                    exception
                    );
                var decompiled = new Decompiled(
                    methodDetails,
                    Array.Empty<MethodId>(),
                    Array.Empty<MethodId>(),
                    Array.Empty<TypeIdEx>(),
                    methodMember.MetadataToken,
                    methodMemberEx,
                    methodMember.GenericArguments
                    );
                return decompiled;
            }

            try
            {
                var decompiler = new Core.IL.Decompiler(path, targetFramework);
                return Get((methodMember, typeId) => GetFromDecompiler(methodMember, typeId, decompiler));
            }
            catch (Exception exception)
            {
                return Get((methodMember, typeId) => GetFromException(methodMember, typeId, exception));
            }
        }
    }
}
