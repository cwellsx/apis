using Core.CecilToLifted;
using Core.Id.Types;
using Core.Output;
using Core.Output.Ids;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Core.CecilToOutput
{
    internal class ToTypeId
    {
        readonly string _assemblyName;
        readonly TokenMaps _tokenMaps;

        internal ToTypeId(string assemblyName, TokenMaps tokenMaps)
        {
            _assemblyName = assemblyName;
            _tokenMaps = tokenMaps;
        }

        internal TypeId Convert(TypeReference tr) => new TypeId(tr.FullName, GetShortName(tr));

        internal ITypeId[]? ConvertGenericArguments(IList<TypeReference> genericArguments) => genericArguments
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
                // function pointer formatting is complex; use Cecil FullName as its representation
                return new FunctionType(fptr.FullName);
            }

            return Recurse(tr);
        }

        static bool IsSimpleOrGenericParameter(TypeReference tr) =>
            tr is TypeDefinition ||
            tr is Mono.Cecil.GenericParameter ||
            tr is not TypeSpecification; // TypeSpecification includes arrays, pointers, byrefs, and generics

        // result of recursing a TypeReference
        ITypeId Recurse(TypeReference tr)
        {
            SpecificationType Result(ITypeId Simple, string? Suffix, ITypeId[]? GenericArgs)
            {
                var typeSpecData = new TypeSpecData(Simple, GenericArgs, Suffix);
                var typeSpecId = _tokenMaps.AddTypeSpec(typeSpecData);
                return new SpecificationType(typeSpecId);
            }

            // Base: simple types and generic parameters
            if (IsSimpleOrGenericParameter(tr))
            {
                return GetBaseTypeId(tr);
            }

            // Generic instance: resolve each generic argument recursively,
            // then treat the element type (generic definition) as the simple part.
            if (tr is GenericInstanceType git)
            {
                var genericArgs = ConvertGenericArguments(git.GenericArguments);

                var simple = GetBaseTypeId(git.ElementType); // generic definition
                return Result(simple, null, genericArgs);
            }

            // Array
            if (tr is ArrayType at)
            {
                var inner = Recurse(at.ElementType);
                var thisSuffix = $"[{string.Join(",", at.Dimensions)}]";
                return Result(inner, thisSuffix, null);
            }

            // Pointer
            if (tr is PointerType pt)
            {
                var inner = Recurse(pt.ElementType);
                return Result(inner, "*", null);
            }

            // ByRef
            if (tr is ByReferenceType br)
            {
                var inner = Recurse(br.ElementType);
                return Result(inner, "&", null);
            }

            // Optional modifier
            if (tr is OptionalModifierType opt)
            {
                var inner = Recurse(opt.ElementType);
                return Result(inner, $" modopt({opt.ModifierType.FullName})", null);
            }

            // Required modifier
            if (tr is RequiredModifierType req)
            {
                var inner = Recurse(req.ElementType);
                return Result(inner, $" modreq({req.ModifierType.FullName})", null);
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
                if (td.AssemblyName() != _assemblyName)
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

                //string ownerAssembly = gp.ReferencedAssemblyName();

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

                return new RemoteType(resolved.AssemblyName(), resolved.MetadataToken.ToInt32());
            }
        }
    }
}
