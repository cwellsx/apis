using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

/*
 * The functions of this class are:
 * 
 * - Use and encapsulate the Decompiler class
 * - Catch any exceptions it may throw
 * - Convert its Result data to TypeId etc.
 * 
 * The output from this class is consumed by MethodGraphs.
 */

namespace Core
{
    using MethodsDictionary = Dictionary<MethodMember, MethodDetails>;
    using TypesDictionary = Dictionary<TypeId, TypeMethods>;

    record TypeMethods(TypeId[]? GenericTypeParameters, MethodsDictionary MethodsDictionary);

    public class MethodReader
    {
        readonly Func<string?, bool> _isMicrosoftAssemblyName;
        (string assemblyName, Core.IL.Decompiler decompiler, TypesDictionary typesDictionary)? _assembly;
        MethodsDictionary? _methodsDictionary;

        private Dictionary<string, TypesDictionary> Dictionary { get; } = new Dictionary<string, TypesDictionary>();
        public List<Error> Errors { get; } = new List<Error>();

        internal MethodReader(Func<string?, bool> isMicrosoftAssemblyName)
        {
            _isMicrosoftAssemblyName = isMicrosoftAssemblyName;
        }

        internal void NewAssembly(string assemblyName, string path)
        {
            try
            {
                _assembly = null;
                _methodsDictionary = null;
                var decompiler = new Core.IL.Decompiler(path);
                var typesDictionary = new TypesDictionary();
                Dictionary.Add(assemblyName, typesDictionary);
                _assembly = (assemblyName, decompiler, typesDictionary);
            }
            catch (Exception e)
            {
                OnException(e, path);
            }
        }

        internal void NewType(TypeId? typeId, TypeId[]? genericTypeParamaters)
        {
            _methodsDictionary = null;
            if (_assembly == null || typeId == null)
            {
                return;
            }
            _methodsDictionary = new MethodsDictionary();
            _assembly.Value.typesDictionary.Add(typeId, new TypeMethods(genericTypeParamaters, _methodsDictionary));
        }

        internal void Add(MethodMember methodMember, MethodInfo methodInfo)
        {
            if (_assembly == null || _methodsDictionary == null)
            {
                return;
            }
            var decompiler = _assembly.Value.decompiler;
            var (asText, results) = decompiler.Decompile(methodInfo);
            var methodDetails = new MethodDetails(
                asText,
                results.Select(method => method.Transform(_isMicrosoftAssemblyName)).ToArray()
                );
            // the compiler adds attributes to method definitions which may not be present on method references
            _methodsDictionary.Add(methodMember.Simplify(_isMicrosoftAssemblyName), methodDetails);
        }

        internal string ToJson(bool prettyPrint) => Serializer.ToJson(this, prettyPrint);

        // the keys of the Dictionary are elements of the AssemblyLoader arrays
        // so to verify that decompiled Call instances exist and match AssemblyLoader instances
        // it's sufficient to look in the Dictionary
        internal void InterConnect()
        {
            // verify that every decompiled subroutine call is to a known type and method
            foreach (var (assemblyName, typesDictionary) in Dictionary)
            {
                foreach (var (typeId, typeMethods) in typesDictionary)
                {
                    var methodsDictionary = typeMethods.MethodsDictionary;
                    Assert(typeId.AssemblyName == assemblyName, "TypeId AssemblyName", typeId);
                    foreach (var (methodMember, methodDetails) in methodsDictionary)
                    {
                        foreach (var call in methodDetails.Calls
                            .Where(call => !_isMicrosoftAssemblyName(call.declaringType.AssemblyName))
                            .Where(call => call.methodMember.IsConstructor != true) // TODO delete this
                            )
                        {
                            Connect(call);
                        }
                    }
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

        private void OnException(Exception e, object @object) => Assert(false, e.Message, @object);

        private bool Assert(bool b, string message, object extra, params object[] more)
        {
            if (!b)
            {
                // to debug this error, visually compare Core.json with Methods.json 
                Errors.Add(new Error(message, extra, more));
            }
            return b;
        }

        private void Connect(MethodId call)
        {
            if (
                !Assert(call.declaringType.AssemblyName != null, "Call missing AssemblyName", call) ||
                !Assert(Dictionary.TryGetValue(call.declaringType.AssemblyName!, out var typesDictionary), "Call unknown AssemblyName", call) ||
                !Find(typesDictionary!, call, out var methodDetails)
                )
            {
                return;
            }

            methodDetails!.CalledBy.Add(call);
        }

        private bool Find(TypesDictionary typesDictionary, MethodId call, out MethodDetails? methodDetails)
        {
            methodDetails = null;

            if (!Assert(typesDictionary!.TryGetValue(call.declaringType.WithoutArguments(), out var typeMethods), "Call unknown TypeId", call))
            {
                return false;
            }
            var methodsDictionary = typeMethods!.MethodsDictionary;
            var genericTypeParameters = typeMethods.GenericTypeParameters;
            if (!Assert(genericTypeParameters?.Length == call.declaringType.GenericTypeArguments?.Length, "Mismatched genericTypeParameters", call.declaringType))
            {
                return false;
            }
            // more-complicated method search if it's a generic type or a generic method
            bool isGeneric = (call.declaringType.GenericTypeArguments != null);

            if (call.methodMember.GenericArguments != null)
            {
                isGeneric = true;
            }

            if (!isGeneric)
            {
                if (methodsDictionary!.TryGetValue(call.methodMember, out methodDetails))
                {
                    return true;
                }

                var found = methodsDictionary!.Keys.Where(key => (
                    key.Name == call.methodMember.Name &&
                    key.Access == call.methodMember.Access &&
                    key.Parameters?.Length == call.methodMember.Parameters?.Length
                )).ToArray();
                switch (found.Length)
                {
                    case 0:
                        return Assert(false, "Call unknown MethodMember", call);
                    case 1:
                        Assert(false, "Call approximate MethodMember", call, found);
                        methodDetails = methodsDictionary[found[0]];
                        return true;
                    default:
                        return Assert(false, "Call overloaded MethodMember", call, found);
                }
            }
            else
            {
                // can't find by key because actual (specialized) paramaters don't match generic parameters
                var found = methodsDictionary!.Keys
                    .Where(key => key.GenericArguments?.Length == call.methodMember.GenericArguments?.Length
                    && key.Name == call.methodMember.Name
                    )
                    .ToArray();
                Func<MethodMember, MethodMember> withArguments = (methodMember) => methodMember.WithArguments(
                    call.methodMember.GenericArguments,
                    genericTypeParameters,
                    call.declaringType.GenericTypeArguments,
                    _isMicrosoftAssemblyName
                    );
                var single = found.SingleOrDefault(key => call.methodMember == withArguments(key));
                if (single != null)
                {
                    methodDetails = methodsDictionary[single];
                    return true;
                }
                switch (found.Length)
                {
                    case 0:
                        return Assert(false, "Call unknown generic member", call);
                    case 1:
                        Assert(false, "Call approximate generic member", call, found[0], withArguments(found[0]));
                        methodDetails = methodsDictionary[found[0]];
                        return true;
                    default:
                        return Assert(false, "Call overloaded generic member", call, found);
                }
            }
        }
    }
}
