using Core.Id.Types;
using Core.Output.Ids;
using Mono.Cecil;
using System;
using System.Linq;

namespace Core.CecilToOutput
{
    internal class ToTypeId
    {
        string _assemblyName;

        internal ToTypeId(string assemblyName)
        {
            _assemblyName = assemblyName;
        }

        internal TypeId Convert(TypeReference tr) => new TypeId(tr.FullName, GetShortName(tr));

        internal ITypeId[]? ConvertGenericArguments(Mono.Collections.Generic.Collection<TypeReference> genericArguments) => genericArguments
            .Select(tr => Convert(tr).LeafId)
            .ToArrayOrNull();

        private ITypeId GetShortName(TypeReference tr)
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

            // Function pointer is not a base type so don't recurse for it
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
                return new FunctionType(fptr.FullName);
            }

            var recurseResult = Recurse(tr);
            return new SpecificationType(Resolved: recurseResult.Simple, GenericTypeArguments: recurseResult.GenericArgs, Suffix: recurseResult.Suffix);
        }

        static bool IsSimpleOrGenericParameter(TypeReference tr) =>
            tr is TypeDefinition ||
            tr is Mono.Cecil.GenericParameter ||
            tr is not TypeSpecification; // TypeSpecification includes arrays, pointers, byrefs, and generics

        // result of recursing a TypeReference
        public sealed record RecurseResult(IBaseTypeId Simple, string? Suffix, ITypeId[]? GenericArgs);

        RecurseResult Recurse(TypeReference tr)
        {
            // Base: simple types and generic parameters
            if (IsSimpleOrGenericParameter(tr))
            {
                return new RecurseResult(GetBaseTypeId(tr), null, null);
            }

            // Generic instance: resolve each generic argument recursively,
            // then treat the element type (generic definition) as the simple part.
            if (tr is GenericInstanceType git)
            {
                var genericArgs = ConvertGenericArguments(git.GenericArguments);

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
            if (tr is PinnedType || tr is SentinelType || tr is FunctionPointerType)
            {
                throw new Exception($"Unexpected pinned type: {tr.FullName}"); // Cecil doesn't include pinned in the FullName, so we shouldn't encounter it here
            }

            throw new NotSupportedException();
        }

        private IBaseTypeId GetBaseTypeId(TypeReference tr)
        {
            // 1. Local type definition
            if (tr is TypeDefinition td)
            {
                if (td.Module.Assembly.Name.Name != _assemblyName)
                {
                    throw new Exception();
                }
                return new LocalType(td.MetadataToken.ToInt32());
            }

            // 2. Local TypeSpec (constructed/modified type)
            if (tr is TypeSpecification ts)
            {
                throw new Exception($"Unexpected TypeSpecification: {tr.FullName}");
            }

            // 3. Generic parameter (type-level or method-level)
            if (tr is Mono.Cecil.GenericParameter gp)
            {
                var owner = gp.Owner;

                bool ownerIsMethod = owner is MethodDefinition md;
                int ownerToken = ownerIsMethod
                    ? ((MethodDefinition)owner).MetadataToken.ToInt32()
                    : ((TypeDefinition)owner).MetadataToken.ToInt32();

                string ownerAssembly = gp.Module.Assembly.Name.Name;

                return new Core.Id.Types.GenericParameter(
                    //ownerAssembly: ownerAssembly,
                    //ownerToken: ownerToken,
                    //ownerIsMethod: ownerIsMethod,
                    //position: gp.Position,
                    ParameterName: gp.Name
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

                return new RemoteType(resolved.Module.Assembly.Name.Name, resolved.MetadataToken.ToInt32());
            }
        }
    }
}
