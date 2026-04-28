import * as DotNet from "../../contracts/dotnet2";
import { assert, getOrThrow } from "../utils";
import type {
  AnyDefId,
  AnyOwnerId,
  AssemblyId,
  BaseTypeId,
  GenericParamId,
  MethodDefId,
  MethodId,
  MethodRefId,
  TypeId,
  TypeRefId,
} from "./bigIds";
import {
  addGenericParamTableId,
  addMethodRefTableId,
  addTypeRefTableId,
  packGenericParamId,
  packMethodDefId,
  packMethodRefId,
  packTypeDefId,
  packTypeRefId,
} from "./bigIds";
import type { GenericParams, MethodReferences, SignatureTypes, TypeReferences } from "./schema";

type ToSyntheticId<T> = (id: number, assemblyId: AssemblyId) => T;
type ToTypeId = (id: DotNet.TypeId) => TypeId;
type MapGenericParams = Map<string, GenericParamId>;

const createSyntheticIds = <T>(pack: ToSyntheticId<T>) => {
  const allocated = new Map<AssemblyId, number>();

  const newSyntheticId = (assemblyId: AssemblyId): T => {
    let id = allocated.get(assemblyId);
    id = !id ? 1 : id + 1;
    allocated.set(assemblyId, id);
    return pack(id, assemblyId);
  };
  return newSyntheticId;
};

const createTypeRefIds = () =>
  createSyntheticIds<TypeRefId>((id, assemblyId) => packTypeRefId(addTypeRefTableId(id), assemblyId));

const createGenericParamIds = () =>
  createSyntheticIds<GenericParamId>((id, assemblyId) => packGenericParamId(addGenericParamTableId(id), assemblyId));

const createMethodRefIds = () =>
  createSyntheticIds<MethodRefId>((id, assemblyId) => packMethodRefId(addMethodRefTableId(id), assemblyId));

export const parseTypeIds = (assemblyIds: Map<string, AssemblyId>) => {
  const newTypeRefId = createTypeRefIds();
  const newGenericParamId = createGenericParamIds();
  const newMethodRefId = createMethodRefIds();

  const getAssemblyId = (assemblyName: string): AssemblyId => getOrThrow(assemblyIds, assemblyName);

  const typeReferences: TypeReferences[] = [];
  const methodReferences: MethodReferences[] = [];
  const signatureTypes: SignatureTypes[] = [];
  const genericParams: GenericParams[] = [];

  const ownGenericParams = new Map<AnyDefId, GenericParams[]>();
  const allGenericParams = new Map<AnyDefId, MapGenericParams>();

  const toGenericParams = (
    owner: AnyDefId,
    assemblyName: string,
    genericParameters: string[],
    previousOwner?: AnyDefId
  ): MapGenericParams => {
    const result = genericParameters.map((value, index) => ({
      id: newGenericParamId(getAssemblyId(assemblyName)),
      owner,
      seqno: index,
      name: value,
    }));
    genericParams.push(...result);
    ownGenericParams.set(owner, result);

    const previous = previousOwner ? ownGenericParams.get(previousOwner) : undefined;
    const combined = [...(previous ? previous : []), ...result];
    const map = new Map<string, GenericParamId>(combined.map((value) => [value.name, value.id]));
    allGenericParams.set(owner, map);
    return map;
  };

  const toSignatureTypes = (ownerId: AnyOwnerId, typeIds: DotNet.TypeId[], toTypeId: ToTypeId) => {
    typeIds.forEach((argument, index) => signatureTypes.push({ ownerId, seqno: index, argument: toTypeId(argument) }));
  };

  const getToTypeId = (assemblyName: string, genericParameters: MapGenericParams): ToTypeId => {
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

  const toMethodId = (id: DotNet.MethodId, assemblyName: string, fromId: MethodDefId): MethodId => {
    // id is number | string => MethodDefId
    const toMethodeDefId = (id: number | string): MethodDefId => {
      if (typeof id === "string") {
        const split = id.split("|");
        assert(split.length == 2, `Expect ${id} to contain "|"`);
        id = Number.parseInt(split[1]);
        assemblyName = split[0];
      }
      return packMethodDefId(id, getAssemblyId(assemblyName));
    };

    if (!Array.isArray(id)) return toMethodeDefId(id);

    // first element is resolved
    const firstElement = id[0];
    assert(!Array.isArray(firstElement), "First element is resolved MethodDefId");
    const resolved = toMethodeDefId(firstElement);
    const array = id.slice(1); // remove front

    const methodRefId = newMethodRefId(getAssemblyId(assemblyName));
    methodReferences.push({ id: methodRefId, resolved });

    const genericParameters = getOrThrow(allGenericParams, fromId);
    const toTypeId = getToTypeId(assemblyName, genericParameters);
    toSignatureTypes(methodRefId, array, toTypeId);

    return methodRefId;
  };

  const getTypeReferences = () => ({ typeReferences, signatureTypes, genericParams, methodReferences });

  return { toGenericParams, getToTypeId, getTypeReferences, toSignatureTypes, toMethodId };
};
