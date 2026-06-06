using Core.Cecil;
using Core.CecilToLifted.Private;
using Mono.Cecil;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToLifted
{
    internal record CompilerGenerated(string AssemblyName, HashSet<int> Types, Dictionary<int, int> Methods, Dictionary<MetadataToken, MethodData> MapGenericTypes)
    {
        internal static bool IsCompilerGenerated(GenericParameter gp)
        {
            var owner = gp.Owner;
            if (owner is MethodDefinition md)
            {
                Assert(!md.DeclaringType.IsCompilerGenerated());
                return false;
            }

            var declaringType = (TypeDefinition)gp.Owner;
            return declaringType.IsCompilerGenerated();
        }

        private GenericParameter LiftCompilerGenerated(GenericParameter gp)
        {
            var declaringType = (TypeDefinition)gp.Owner;

            if (MapGenericTypes.TryGetValue(declaringType.MetadataToken, out var methodData))
            {
                // type is a generic lambda which may have captured its generic prameters from the enclosing method
                var foundMethodParameter = methodData.MethodDefinition.GenericParameters.SingleOrDefault(value => value.Name == gp.Name);
                if (foundMethodParameter != null)
                {
                    return foundMethodParameter;
                }
                var methodDeclaringType = methodData.MethodDefinition.DeclaringType;
                foundMethodParameter = methodDeclaringType.GenericParameters.Single(value => value.Name == gp.Name);
                return foundMethodParameter;
            }

            while (declaringType.IsCompilerGenerated())
            {
                declaringType = declaringType.DeclaringType;
            }

            var foundTypeParameter = declaringType.GenericParameters.Single(value => value.Name == gp.Name);
            return foundTypeParameter;
        }

        internal GenericParameter LiftGenericParameter(GenericParameter gp)
        {
            while (IsCompilerGenerated(gp))
            {
                gp = LiftCompilerGenerated(gp);
            }
            return gp;
        }

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
