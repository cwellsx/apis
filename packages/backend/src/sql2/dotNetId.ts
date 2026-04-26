import * as DotNet from "../../contracts/dotnet2";
import { assert, getOrThrow } from "../utils";
import type { AnyDefId, AssemblyId, GenericParamId, TypeDefId, TypeId, TypeRefId } from "./bigIds";
import { addGenericParamTableId, addTypeRefTableId, packGenericParamId, packTypeDefId, packTypeRefId } from "./bigIds";
import type { GenericParams, TypeArguments, TypeReferences } from "./schema";

export const getLocalTypeId = (id: DotNet.LocalTypeId): number => {
  assert((typeof id as unknown) === "number", `${id} must be a number`);
  return id;
};

const createTypeRefIds = () => {
  const allocated = new Map<AssemblyId, number>();

  const newTypeRefId = (assemblyId: AssemblyId): TypeRefId => {
    let id = allocated.get(assemblyId);
    id = !id ? 1 : id + 1;
    allocated.set(assemblyId, id);
    return packTypeRefId(addTypeRefTableId(id), assemblyId);
  };
  return { newTypeRefId };
};

const createGenericParamIds = () => {
  const allocated = new Map<AssemblyId, number>();

  const newGenericParamId = (assemblyId: AssemblyId): GenericParamId => {
    let id = allocated.get(assemblyId);
    id = !id ? 1 : id + 1;
    allocated.set(assemblyId, id);
    return packGenericParamId(addGenericParamTableId(id), assemblyId);
  };
  return { newGenericParamId };
};

export const parseTypeIds = (assemblyIds: Map<string, AssemblyId>) => {
  const { newTypeRefId } = createTypeRefIds();
  const { newGenericParamId } = createGenericParamIds();

  const getAssemblyId = (assemblyName: string): AssemblyId => getOrThrow(assemblyIds, assemblyName);

  const typeReferences: TypeReferences[] = [];
  const typeArguments: TypeArguments[] = [];
  const genericParams: GenericParams[] = [];

  // id is number | string => TypeDefId
  const toTypeDefId = (id: number | string, assemblyName: string): TypeDefId => {
    if (typeof id === "string") {
      const split = id.split("|");
      id = Number.parseInt(split[1]);
      assemblyName = split[0];
    }
    return packTypeDefId(id, getAssemblyId(assemblyName));
  };

  const toGenericParams = (
    owner: AnyDefId,
    assemblyName: string,
    genericTypeParameters: string[]
  ): Map<string, GenericParamId> =>
    new Map<string, GenericParamId>(
      genericTypeParameters.map((value, index) => {
        const paramId = newGenericParamId(getAssemblyId(assemblyName));
        genericParams.push({ id: paramId, owner, seqno: index, name: value });
        return [value, paramId];
      })
    );

  const toTypeId = (
    id: DotNet.TypeId,
    assemblyName: string,
    genericTypeParameters: Map<string, GenericParamId>
  ): TypeId => {
    if (typeof id === "string" && genericTypeParameters.has(id)) return getOrThrow(genericTypeParameters, id);

    if (!Array.isArray(id)) return toTypeDefId(id, assemblyName);

    // first element is resolved
    const firstElement = id[0];
    assert(!Array.isArray(firstElement), "First element is resolved TypeDefId");
    const resolved = toTypeDefId(firstElement, assemblyName);

    const typeRefId = newTypeRefId(getAssemblyId(assemblyName));
    id.shift();

    const last = id[id.length - 1];
    const suffix: string | undefined = typeof last === "string" && !last.includes("|") ? last : undefined;
    if (suffix) id.pop();
    typeReferences.push({ id: typeRefId, resolved, suffix });

    id.forEach((argument, index) =>
      typeArguments.push({
        id: typeRefId,
        seqno: index,
        argument: toTypeId(argument, assemblyName, genericTypeParameters),
      })
    );

    return resolved;
  };

  const getTypeReferences = () => ({ typeReferences, typeArguments, genericParams });

  return { toGenericParams, toTypeId, getTypeReferences };
};
