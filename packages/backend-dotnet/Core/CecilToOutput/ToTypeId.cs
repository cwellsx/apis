using Core.Output;
using Mono.Cecil;
using System;
using System.Collections.Generic;

namespace Core.CecilToOutput
{
    internal class ToTypeId
    {
        internal static TypeId Convert(TypeReference tr)
        {
            if (IsSimple(tr))
            {
                return GetSimpleTypeId(tr);
            }

            var list = new List<SimpleTypeId>();
            var resolved = Recurse(tr, list);
            return new TypeSpecId(Resolved: resolved, GenericTypeArguments: list.ToArray(), FullName: tr.FullName);
        }

        static SimpleTypeId Recurse(TypeReference tr, List<SimpleTypeId> genericArgs)
        {
            if (IsSimple(tr))
            {
                return GetSimpleTypeId(tr);
            }
            if (tr is GenericInstanceType git)
            {
                foreach (var arg in git.GenericArguments)
                {
                    var index = genericArgs.Count;
                    genericArgs.Add(null!);
                    var resolved = Recurse(arg, genericArgs);
                    genericArgs[index] = resolved;
                }
                // the generic type definition is the "simple" part of the TypeSpec
                return GetSimpleTypeId(git.ElementType);
            }
            // for arrays, pointers, byrefs, and other TypeSpecs, the "simple" part is the element type
            return Recurse(tr.GetElementType(), genericArgs);
        }

        static bool IsSimple(TypeReference tr) =>
            tr is TypeDefinition ||
            tr is GenericParameter ||
            tr is not TypeSpecification; // TypeSpecification includes arrays, pointers, byrefs, and generics

        private static SimpleTypeId GetSimpleTypeId(TypeReference tr)
        {
            // 1. Local type definition
            if (tr is TypeDefinition td)
            {
                return new LocalTypeDefId(td.MetadataToken.ToInt32());
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

                return new GenericParameterId(
                    OwnerAssembly: ownerAssembly,
                    OwnerToken: ownerToken,
                    OwnerIsMethod: ownerIsMethod,
                    Position: gp.Position,
                    Name: gp.Name
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

                string assemblyName = resolved.Module.Assembly.Name.Name;
                int token = resolved.MetadataToken.ToInt32();

                return new RemoteTypeDefId(assemblyName, token);
            }
        }
    }
}
