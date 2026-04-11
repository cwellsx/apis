using Core.Output;
//using Core.TypeIds;
using Mono.Cecil;
using System;
using System.Collections.Generic;

/*
 * This resolves a Cecil TypeReference to an app-specific TypeId
 * 
 * TypeId // abstract superclass
 * - BaseTypeId : TypeId // simple or generic parameter
 *   - SimpleTypeId : BaseTypeId // resolved type definition
 *     - LocalTypeId : SimpleTypeId // type definition in current assembly
 *     - RemoveTypeId : SimpleTypeId // type definition in remote assembly
 *   - GenericParameterTypeId : BaseTypeId // e.g. "T"
 * - SpecTypeId(BaseTypeId Resolved, TypeId[]? GenericTypeArguments, string? Suffix) : TypeId
 */

namespace Core.CecilToOutput
{
    internal class ToTypeId
    {
        string _assemblyName;

        internal ToTypeId(string assemblyName)
        {
            _assemblyName = assemblyName;
        }

        internal TypeId Convert(TypeReference tr)
        {
            // remove Pinned or Sentinel which aren't really part of the type and aren't include in the FullName
            if (tr is PinnedType pinned)
            {
                tr = pinned.ElementType;
            }
            else if (tr is SentinelType sentinel)
            {
                tr = sentinel.ElementType;
            }

            if (IsSimpleOrGenericParameter(tr))
            {
                return GetBaseTypeId(tr);
            }

            var recurseResult = Recurse(tr);
            if (recurseResult.GenericArgs.Count == 0 && string.IsNullOrEmpty(recurseResult.Suffix))
            {
                throw new Exception();
            }
            return new SpecTypeId(Resolved: recurseResult.Simple, GenericTypeArguments: recurseResult.GenericArgs.ToArrayOrNull(), Suffix: recurseResult.Suffix, FullName: tr.FullName);
        }

        static bool IsSimpleOrGenericParameter(TypeReference tr) =>
            tr is TypeDefinition ||
            tr is GenericParameter ||
            tr is not TypeSpecification; // TypeSpecification includes arrays, pointers, byrefs, and generics

        // result of recursing a TypeReference
        public sealed record RecurseResult(BaseTypeId Simple, string? Suffix, IReadOnlyList<TypeId> GenericArgs);

        RecurseResult Recurse(TypeReference tr)
        {
            // Base: simple types and generic parameters
            if (IsSimpleOrGenericParameter(tr))
            {
                return new RecurseResult(GetBaseTypeId(tr), string.Empty, Array.Empty<TypeId>());
            }

            // Generic instance: resolve each generic argument recursively,
            // then treat the element type (generic definition) as the simple part.
            if (tr is GenericInstanceType git)
            {
                var genericArgs = new List<TypeId>(git.GenericArguments.Count);
                foreach (var arg in git.GenericArguments)
                {
                    genericArgs.Add(Convert(arg));
                }

                var simple = GetBaseTypeId(git.ElementType); // generic definition
                return new RecurseResult(simple, null, genericArgs);
            }

            // Array
            if (tr is ArrayType at)
            {
                var inner = Recurse(at.ElementType);
                var thisSuffix = $"[{string.Join(",", at.Dimensions)}]";
                return new RecurseResult(inner.Simple, inner.Suffix + thisSuffix, inner.GenericArgs);
            }

            // Pointer
            if (tr is PointerType pt)
            {
                var inner = Recurse(pt.ElementType);
                return new RecurseResult(inner.Simple, inner.Suffix + "*", inner.GenericArgs);
            }

            // ByRef
            if (tr is ByReferenceType br)
            {
                var inner = Recurse(br.ElementType);
                return new RecurseResult(inner.Simple, inner.Suffix + "&", inner.GenericArgs);
            }

            // Optional modifier
            if (tr is OptionalModifierType opt)
            {
                var inner = Recurse(opt.ElementType);
                return new RecurseResult(inner.Simple, inner.Suffix + $" modopt({opt.ModifierType.FullName})", inner.GenericArgs);
            }

            // Required modifier
            if (tr is RequiredModifierType req)
            {
                var inner = Recurse(req.ElementType);
                return new RecurseResult(inner.Simple, inner.Suffix + $" modreq({req.ModifierType.FullName})", inner.GenericArgs);
            }

            // Pinned or Sentinel
            if (tr is PinnedType || tr is SentinelType)
            {
                throw new Exception($"Unexpected pinned type: {tr.FullName}"); // Cecil doesn't include pinned in the FullName, so we shouldn't encounter it here
            }

            // Function pointer (if you need it)
            if (tr is FunctionPointerType fptr)
            {
                //// function pointer formatting is complex; represent as a token-like suffix
                //var inner = Recurse(fptr.ReturnType);
                //// you may want to render parameters; here we append a placeholder suffix
                //return new RecurseResult(inner.Simple, inner.Suffix + Optional(" unmanagedcallconv*"), inner.GenericArgs);
                //var funcTypeId = new FuncTypeId(
                //    returnType: Convert(fptr.ReturnType),
                //    parameterTypes: fptr.Parameters.Select(p => Convert(p.ParameterType)).ToArray(),
                //    callingConvention: fptr.CallingConvention
                //);
                var funcTypeId = new FuncTypeId(fptr.FullName);
                return new RecurseResult(funcTypeId, string.Empty, Array.Empty<TypeId>());
            }

            throw new NotSupportedException();
        }

        private BaseTypeId GetBaseTypeId(TypeReference tr)
        {
            // 1. Local type definition
            if (tr is TypeDefinition td)
            {
                if (td.Module.Assembly.Name.Name != _assemblyName)
                {
                    throw new Exception();
                }
                return new LocalTypeId(_assemblyName, td.MetadataToken.ToInt32(), td.FullName);
            }

            // 2. Local TypeSpec (constructed/modified type)
            if (tr is TypeSpecification ts)
            {
                throw new Exception($"Unexpected TypeSpecification: {tr.FullName}");
            }

            // 3. Generic parameter (type-level or method-level)
            if (tr is GenericParameter gp)
            {
                var owner = gp.Owner;

                bool ownerIsMethod = owner is MethodDefinition md;
                int ownerToken = ownerIsMethod
                    ? ((MethodDefinition)owner).MetadataToken.ToInt32()
                    : ((TypeDefinition)owner).MetadataToken.ToInt32();

                string ownerAssembly = gp.Module.Assembly.Name.Name;

                return new GenericParameterTypeId(
                    ownerAssembly: ownerAssembly,
                    ownerToken: ownerToken,
                    ownerIsMethod: ownerIsMethod,
                    position: gp.Position,
                    name: gp.Name
                );
            }

            // 4. Remote type definition (resolved TypeRef)
            //    This is the only remaining case.
            {
                var resolved = tr.Resolve();
                if (resolved == null)
                {
                    throw new InvalidOperationException(
                        $"Unresolvable TypeReference: {tr.FullName}"
                    );
                }

                return new RemoteTypeId(resolved.Module.Assembly.Name.Name, resolved.MetadataToken.ToInt32(), resolved.FullName);
            }
        }
    }
}
