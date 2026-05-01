import { assert } from "../utils";
import * as IdCast from "./idCast";
import { TableId, isTableId, namespaceOffset } from "./idTest";
import type * as Id from "./idTypes";

const assertTableId = (id: number, tableId: TableId) => assert(isTableId(id, tableId));

// pack

const pack = (id: number, assemblyId: Id.AssemblyId): bigint => (BigInt(assemblyId) << 32n) + BigInt(id);

const packId = <T>(id: number, assemblyId: Id.AssemblyId, tableId: TableId, cast: (packed: bigint) => T): T => {
  assertTableId(id, tableId);
  return cast(pack(id, assemblyId));
};

const packTypeDefId = (id: number, assemblyId: Id.AssemblyId): Id.TypeDefId =>
  packId(id, assemblyId, TableId.TypeDef, IdCast.castTypeDefId);
const packTypeRefId = (id: number, assemblyId: Id.AssemblyId): Id.TypeRefId =>
  packId(id, assemblyId, TableId.TypeRef, IdCast.castTypeRefId);
const packGenericParamId = (id: number, assemblyId: Id.AssemblyId): Id.GenericParamId =>
  packId(id, assemblyId, TableId.GenericParam, IdCast.castGenericParamId);
const packMethodDefId = (id: number, assemblyId: Id.AssemblyId): Id.MethodDefId =>
  packId(id, assemblyId, TableId.MethodDef, IdCast.castMethodDefId);
const packMethodRefId = (id: number, assemblyId: Id.AssemblyId): Id.MethodRefId =>
  packId(id, assemblyId, TableId.MethodSpec, IdCast.castMethodRefId);

const packMemberId = (id: number, assemblyId: Id.AssemblyId): Id.MemberId => IdCast.castMemberId(pack(id, assemblyId));

const addTypeRefTableId = (id: number) => id + ((TableId.TypeRef as number) << 24);
const addMethodRefTableId = (id: number) => id + ((TableId.MethodSpec as number) << 24);
const addGenericParamTableId = (id: number) => id + ((TableId.GenericParam as number) << 24);

// synthetic

type ToSyntheticId<T> = (id: number, assemblyId: Id.AssemblyId) => T;

const createSyntheticIds = <T>(pack: ToSyntheticId<T>) => {
  const allocated = new Map<Id.AssemblyId, number>();

  const newSyntheticId = (assemblyId: Id.AssemblyId): T => {
    let id = allocated.get(assemblyId);
    id = !id ? 1 : id + 1;
    allocated.set(assemblyId, id);
    return pack(id, assemblyId);
  };
  return newSyntheticId;
};

const createTypeRefIds = () =>
  createSyntheticIds<Id.TypeRefId>((id, assemblyId) => packTypeRefId(addTypeRefTableId(id), assemblyId));

const createGenericParamIds = () =>
  createSyntheticIds<Id.GenericParamId>((id, assemblyId) => packGenericParamId(addGenericParamTableId(id), assemblyId));

const createMethodRefIds = () =>
  createSyntheticIds<Id.MethodRefId>((id, assemblyId) => packMethodRefId(addMethodRefTableId(id), assemblyId));

export type MakeAssemblyId = (id: number) => Id.AssemblyId;
export type MakeNamespaceId = (id: number) => Id.NamespaceId;
export type MakeTypeDefId = (id: number, assemblyId: Id.AssemblyId, create: boolean) => Id.TypeDefId;
export type MakeMethodDefId = (id: number, assemblyId: Id.AssemblyId, create: boolean) => Id.MethodDefId;
export type MakeMemberId = (id: number, assemblyId: Id.AssemblyId) => Id.MemberId;
export type NewTypeRefId = (assemblyId: Id.AssemblyId) => Id.TypeRefId;
export type NewGenericParamId = (assemblyId: Id.AssemblyId) => Id.GenericParamId;
export type NewMethodRefId = (assemblyId: Id.AssemblyId) => Id.MethodRefId;

export type IdCreate = {
  makeAssemblyId: MakeAssemblyId;
  makeNamespaceId: MakeNamespaceId;
  makeTypeDefId: MakeTypeDefId;
  makeMethodDefId: MakeMethodDefId;
  makeMemberId: MakeMemberId;
  newTypeRefId: NewTypeRefId;
  newGenericParamId: NewGenericParamId;
  newMethodRefId: NewMethodRefId;
};

export const createIds = (): IdCreate => {
  const allTypeDefIds = new Set<Id.TypeDefId>();
  const allMethodDefIds = new Set<Id.MethodDefId>();

  const assertSet = <T>(all: Set<T>, id: T, create: boolean): T => {
    if (create) {
      assert(!all.has(id));
      all.add(id);
    } else assert(all.has(id));
    return id;
  };

  const assertTypeDefId = (id: Id.TypeDefId, create: boolean): Id.TypeDefId => assertSet(allTypeDefIds, id, create);
  const assertMethodDefId = (id: Id.MethodDefId, create: boolean): Id.MethodDefId =>
    assertSet(allMethodDefIds, id, create);

  const makeAssemblyId = (id: number): Id.AssemblyId => IdCast.castAssemblyId(id);
  const makeNamespaceId = (id: number): Id.NamespaceId => IdCast.castNamespaceId(id + namespaceOffset);

  const makeTypeDefId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.TypeDefId =>
    assertTypeDefId(packTypeDefId(id, assemblyId), create);

  const makeMethodDefId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MethodDefId =>
    assertMethodDefId(packMethodDefId(id, assemblyId), create);

  const makeMemberId = (id: number, assemblyId: Id.AssemblyId): Id.MemberId => packMemberId(id, assemblyId);

  const newTypeRefId = createTypeRefIds();
  const newGenericParamId = createGenericParamIds();
  const newMethodRefId = createMethodRefIds();

  return {
    makeAssemblyId,
    makeNamespaceId,
    makeTypeDefId,
    makeMethodDefId,
    makeMemberId,
    newTypeRefId,
    newGenericParamId,
    newMethodRefId,
  };
};
