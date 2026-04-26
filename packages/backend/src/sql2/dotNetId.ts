import * as DotNet from "../../contracts/dotnet2";
import { assert, getOrThrow } from "../utils";
import type { AnyDefId, AnyOwnerId, AssemblyId, BaseTypeId, GenericParamId, TypeId, TypeRefId } from "./bigIds";
import { addGenericParamTableId, addTypeRefTableId, packGenericParamId, packTypeDefId, packTypeRefId } from "./bigIds";
import type { GenericParams, SignatureTypes, TypeReferences } from "./schema";

type ToTypeId = (id: DotNet.TypeId) => TypeId;

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
  const signatureTypes: SignatureTypes[] = [];
  const genericParams: GenericParams[] = [];
  const mapGenericParams = new Map<AnyDefId, GenericParams[]>();

  const toGenericParams = (
    owner: AnyDefId,
    assemblyName: string,
    genericParameters: string[],
    previousOwner?: AnyDefId
  ): Map<string, GenericParamId> => {
    const result = genericParameters.map((value, index) => ({
      id: newGenericParamId(getAssemblyId(assemblyName)),
      owner,
      seqno: index,
      name: value,
    }));
    genericParams.push(...result);
    mapGenericParams.set(owner, result);

    const previous = previousOwner ? mapGenericParams.get(previousOwner) : undefined;
    const combined = [...(previous ? previous : []), ...result];
    return new Map<string, GenericParamId>(combined.map((value) => [value.name, value.id]));
  };

  const toSignatureTypes = (ownerId: AnyOwnerId, typeIds: DotNet.TypeId[], toTypeId: ToTypeId) => {
    typeIds.forEach((argument, index) => signatureTypes.push({ ownerId, seqno: index, argument: toTypeId(argument) }));
  };

  const getToTypeId = (assemblyName: string, genericParameters: Map<string, GenericParamId>): ToTypeId => {
    // toTypeId is closure
    const toTypeId = (id: DotNet.TypeId) => {
      // id is number | string => TypeDefId
      const toTypeDefId = (id: number | string): BaseTypeId => {
        if (typeof id === "string") {
          const genericParamId =
            id[0] === "!" ? getOrThrow(genericParameters, id.substring(1)) : genericParameters.get(id);
          if (genericParamId) return genericParamId;
          const split = id.split("|");
          assert(split.length == 2, `Expect ${id} to contain "|"`);
          id = Number.parseInt(split[1]);
          assemblyName = split[0];
        }
        return packTypeDefId(id, getAssemblyId(assemblyName));
      };

      if (!Array.isArray(id)) return toTypeDefId(id);

      // first element is resolved
      const firstElement = id[0];
      assert(!Array.isArray(firstElement), "First element is resolved TypeDefId");
      const resolved = toTypeDefId(firstElement);
      const typeRefId = newTypeRefId(getAssemblyId(assemblyName));

      // last element is optionally suffix
      const last = id[id.length - 1];
      const suffix: string | undefined = typeof last === "string" && !last.includes("|") ? last : undefined;

      // remove front and optionally remove back
      const array = id.slice(1, suffix ? -1 : undefined);

      typeReferences.push({ id: typeRefId, resolved, suffix });
      toSignatureTypes(typeRefId, array, toTypeId);
      return resolved;
    };

    return toTypeId;
  };

  const getTypeReferences = () => ({ typeReferences, signatureTypes, genericParams });

  return { toGenericParams, getToTypeId, getTypeReferences, toSignatureTypes };
};
