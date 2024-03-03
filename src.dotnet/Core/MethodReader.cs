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
    using TypesDictionary = Dictionary<TypeId, Dictionary<MethodMember, MethodDetails>>;

    public class MethodReader
    {
        readonly Func<string?, bool> _isDotNetAssemblyName;
        (string assemblyName, ILCore.Decompiler decompiler, TypesDictionary typesDictionary)? _assembly;
        MethodsDictionary? _methodsDictionary;

        public Dictionary<string, TypesDictionary> Dictionary { get; } = new Dictionary<string, TypesDictionary>();
        public List<Error> Errors { get; } = new List<Error>();

        internal MethodReader(Func<string?, bool> isDotNetAssemblyName)
        {
            _isDotNetAssemblyName = isDotNetAssemblyName;
        }

        internal void NewAssembly(string assemblyName, string path)
        {
            try
            {
                _assembly = null;
                _methodsDictionary = null;
                var decompiler = new ILCore.Decompiler(path);
                var typesDictionary = new TypesDictionary();
                Dictionary.Add(assemblyName, typesDictionary);
                _assembly = (assemblyName, decompiler, typesDictionary);
            }
            catch (Exception e)
            {
                OnException(e, path);
            }
        }

        internal void NewType(TypeId? typeId)
        {
            _methodsDictionary = null;
            if (_assembly == null || typeId == null)
            {
                return;
            }
            _methodsDictionary = new MethodsDictionary();
            _assembly.Value.typesDictionary.Add(typeId, _methodsDictionary);
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
                results.Select(MethodReaderExtensions.Transform).ToArray()
                );
            _methodsDictionary.Add(methodMember, methodDetails);
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
                foreach (var (typeId, methodsDictionary) in typesDictionary)
                {
                    Assert(typeId.AssemblyName == assemblyName, "TypeId AssemblyName", typeId);
                    foreach (var (methodMember, methodDetails) in methodsDictionary)
                    {
                        foreach (var call in methodDetails.Calls
                            .Where(call => !_isDotNetAssemblyName(call.declaringType.AssemblyName))
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
                    Assert(typeInfo.TypeId?.GenericTypeArguments == null, "Generic Arguments", typeInfo);
                    Assert(typeInfo.TypeId?.AssemblyName != null, "Type assembly name", typeInfo);
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

        private bool Assert(bool b, string message, object @object)
        {
            if (!b)
            {
                Errors.Add(new Error(message, @object));
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
            MethodsDictionary? methodsDictionary = null;
            // relaxed method search if it's a generic type or a generic method
            bool isGeneric = false;

            if (call.declaringType.GenericTypeArguments == null)
            {
                // not looking for method in a generic type so it should be easy to find
                if (
                    !Assert(typesDictionary!.TryGetValue(Strip(call.declaringType), out methodsDictionary), "Call unknown TypeId", call)
                    )
                {
                    return false;
                }
            }
            else
            {
                // else the call is to the specialization of a generic type but the specialization doesn't exist as a type
                if (
                   !Assert(typesDictionary!.TryGetValue(Strip(call.declaringType), out methodsDictionary), "Call unknown TypeId", call)
                   )
                {
                    return false;
                }
                isGeneric = true;
            }

            if (call.methodMember.GenericArguments != null)
            {
                isGeneric = true;
            }

            if (!isGeneric)
            {
                return (
                    Assert(methodsDictionary!.TryGetValue(call.methodMember, out methodDetails), "Call unknown MethodMember", call)
                    );
            }
            else
            {
                // can't find by key because actual (specialized) paramaters don't match generic parameters
                // could try to swap parameter types but instead look for any method with the right name and right number of parameters
                // i.e. ignore the parameter types and return type and hope that the generic method isn't overloaded
                var found = methodsDictionary!.Keys.Where(key => (
                    key.Name == call.methodMember.Name &&
                    key.Access == call.methodMember.Access &&
                    key.Parameters?.Length == call.methodMember.Parameters?.Length
                )).ToArray();
                switch (found.Length)
                {
                    case 0:
                        return Assert(false, "Call unknown generic member", call);
                    case 1:
                        methodDetails = methodsDictionary[found[0]];
                        return true;
                    default:
                        return Assert(false, "Call overloaded generic member", call);
                }
            }
        }

        private static TypeId Strip(TypeId declaringType)
        {
            return declaringType.GenericTypeArguments == null ? declaringType : new TypeId(
                declaringType.AssemblyName,
                declaringType.Namespace,
                declaringType.Name,
                null, // GenericTypeArguments
                StripNullable(declaringType.DeclaringType)
                );
        }
        private static TypeId? StripNullable(TypeId? declaringType) => declaringType == null ? null : Strip(declaringType);
    }
}
