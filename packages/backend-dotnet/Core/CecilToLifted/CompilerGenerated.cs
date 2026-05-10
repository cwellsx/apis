using Core.Cecil;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;
using Core.CecilToLifted.Private;

namespace Core.CecilToLifted
{
    internal record CompilerGenerated(string AssemblyName, HashSet<int> Types, Dictionary<int, int> Methods)
    {
        // used to remove compiler-generated type definitions from the output
        internal bool IsUserDefined(TypeDefinition typeDefinition)
        {
            if (Types.Contains(typeDefinition.MetadataToken.ToInt32()))
            {
                return false;
            }
            if (typeDefinition.IsLambdaCache() || typeDefinition.IsInsignificantCompilerGenerated())
            {
                return false;
            }
            Assert(!typeDefinition.IsCompilerGenerated());
            return true;
        }

        internal bool IsUserDefined(MethodDefinition methodDefinition)
        {
            Assert(IsUserDefined(methodDefinition.DeclaringType));

            // could but don't use this.Methods which are compiler-generated called MethodReference instances -- these are mostly methods of other, compiler-generated types
            // the only compiler-genrated methods of user types are those which are local methods.
            if (methodDefinition.IsLocalFunction())
            {
                Assert(Methods.ContainsKey(methodDefinition.MetadataToken.ToInt32()));
                return false;
            }
            return true;
        }

        internal bool IsUserDefined(TypeReference typeReference)
        {
            // unwraps            
            while (typeReference is TypeSpecification ts)
            {
                if (ts is GenericInstanceType git)
                {
                    if (!git.GenericArguments.All(IsUserDefined))
                    {
                        return false;
                    }
                }
                typeReference = ts.ElementType;
                //return IsUserDefined(ts.ElementType);
            }

            if (typeReference.ReferencedAssemblyName() != AssemblyName)
            {
                return true;
            }

            var typeDefinition = typeReference.Resolve();
            if (typeDefinition == null)
            {
                return true;
            }
            return IsUserDefined(typeDefinition);
        }

        internal static bool IsCompilerService(MethodReference methodReference)
        {
            var methodDefinition = methodReference.Resolve();
            var declaringType = methodDefinition.DeclaringType;
            return declaringType.Namespace == "System.Runtime.CompilerServices";
        }

        internal bool IsUserDefined(MethodReference methodReference)
        {
            if (!IsUserDefined(methodReference.DeclaringType))
            {
                return false;
            }
            
            if (!(methodReference as GenericInstanceMethod)?.GenericArguments?.All(IsUserDefined) ?? false)
            {
                return false;
            }

            var methodDefinition = methodReference.Resolve();
            if (methodDefinition.IsInsignificantCompilerGenerated())
            {
                return false;
            }
            var declaringType = methodDefinition.DeclaringType;
            if (declaringType.Namespace != "System.Runtime.CompilerServices")
            {
                return true;
            }

            switch (declaringType.Name)
            {
                case "AsyncTaskMethodBuilder":
                case "AsyncTaskMethodBuilder`1":
                case "AsyncValueTaskMethodBuilder":
                case "AsyncValueTaskMethodBuilder`1":
                case "AsyncVoidMethodBuilder":
                    // all builder methods except Create, Start, and get_Task are used inside the compiler-generated types
                    switch (methodDefinition.Name)
                    {
                        case "Create":
                        case "Start":
                        case "get_Task":
                            break;
                        default:
                            Logger.Log($"? {methodReference}");
                            break;
                    }
                    return false;
                case "DefaultInterpolatedStringHandler":
                case "RuntimeHelpers":
                case "Unsafe":
                case "TaskAwaiter":
                case "TaskAwaiter`1":
                case "ConditionalWeakTable`2":
                case "CallSite":
                case "CallSite`1":
                    return true;
                default:
                    Logger.Log($"? {methodReference}");
                    return false;
            }
        }
    }
}
