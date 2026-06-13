using Core.CecilToLifted;
using Core.CecilToLifted.Private;
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
        readonly LiftGenericParameter? _liftGenericParameter;

        internal ToTypeId(string assemblyName, TokenMaps tokenMaps, LiftGenericParameter? liftGenericParameter)
        {
            _assemblyName = assemblyName;
            _tokenMaps = tokenMaps;
            _liftGenericParameter = liftGenericParameter;
        }

        internal TypeId Convert(TypeReference tr) => new TypeId(tr.FullName, GetShortName(tr));

        internal TypeId[]? ConvertGenericArguments(IList<TypeReference> genericArguments) => genericArguments
            .Select(tr => new TypeId(tr.FullName, Convert(tr).LeafId))
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
            SpecificationType Result(TypeId Simple, string? Suffix, TypeId[]? GenericArgs)
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

            Func<TypeReference, TypeId> recurseInner = (elementType) => {
                if (elementType is Mono.Cecil.GenericParameter gp)
                {
                    // Generic parameters can be shared between different generic instances, so we need to lift them to the declaring type/method
                    gp = LiftGenericParameter(gp);
                }
                else
                {
                    Assert(!elementType.Resolve()?.IsCompilerGenerated() ?? true);
                }
                var fullName = elementType.FullName;
                var typeId = Recurse(elementType);
                return new TypeId(fullName, typeId);
            };

            // Generic instance: resolve each generic argument recursively,
            // then treat the element type (generic definition) as the simple part.
            if (tr is GenericInstanceType git)
            {
                var genericArgs = ConvertGenericArguments(git.GenericArguments);
                Assert(IsSimpleOrGenericParameter(git.ElementType));
                return Result(recurseInner(git.ElementType), null, genericArgs);
            }

            // Array
            if (tr is ArrayType at)
            {
                return Result(recurseInner(at.ElementType), $"[{string.Join(",", at.Dimensions)}]", null);
            }

            // Pointer
            if (tr is PointerType pt)
            {
                return Result(recurseInner(pt.ElementType), "*", null);
            }

            // ByRef
            if (tr is ByReferenceType br)
            {
                return Result(recurseInner(br.ElementType), "&", null);
            }

            // Optional modifier
            if (tr is OptionalModifierType opt)
            {
                return Result(recurseInner(opt.ElementType), $" modopt({opt.ModifierType.FullName})", null);
            }

            // Required modifier
            if (tr is RequiredModifierType req)
            {
                return Result(recurseInner(req.ElementType), $" modreq({req.ModifierType.FullName})", null);
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
                return NewGenericParameter(gp);
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

        private Mono.Cecil.GenericParameter LiftGenericParameter(Mono.Cecil.GenericParameter gp)
        {
            if (_liftGenericParameter != null)
            {
                gp = _liftGenericParameter(gp);
            }
            else
            {
                Assert(!CompilerGenerated.IsCompilerGenerated(gp));
            }
            return gp;
        }

        internal Id.Types.GenericParameter NewGenericParameter(Mono.Cecil.GenericParameter gp)
        {
            gp = LiftGenericParameter(gp);

            var declaringType = gp.Owner is MethodDefinition ? ((MethodDefinition)gp.Owner).DeclaringType : (TypeDefinition)gp.Owner;
            Assert(!declaringType.IsCompilerGenerated());

            return new Id.Types.GenericParameter(
                ParameterName: gp.Name,
                MetadataToken: gp.MetadataToken.ToInt32()
            );
        }
    }
}
