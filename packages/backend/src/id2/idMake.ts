import { assert } from "../utils";
import * as IdCast from "./idCast";
import { BoxedId, isTableId, TableId } from "./idTest";
import type * as Id from "./idTypes";

const allIds = new Set<bigint>();

const pack = (id: number, assemblyId: Id.AssemblyId): bigint => (BigInt(assemblyId) << 32n) + BigInt(id);

const make = (id: number, assemblyId: Id.AssemblyId, create: boolean, tableId: TableId): bigint => {
  assert(isTableId(id, tableId));

  const result = pack(id, assemblyId);
  if (create) {
    assert(!allIds.has(result));
    allIds.add(result);
  } else assert(allIds.has(result));
  return result;
};

export const makeTypeDefId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.TypeDefId =>
  IdCast.castTypeDefId(make(id, assemblyId, create, TableId.TypeDef));
export const makeMethodDefId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MethodDefId =>
  IdCast.castMethodDefId(make(id, assemblyId, create, TableId.MethodDef));

export const makeFieldMemberId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MemberId =>
  IdCast.castMemberId(make(id, assemblyId, create, TableId.Field));
export const makeEventMemberId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MemberId =>
  IdCast.castMemberId(make(id, assemblyId, create, TableId.Event));
export const makePropertyMemberId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MemberId =>
  IdCast.castMemberId(make(id, assemblyId, create, TableId.Property));
export const makeMethodMemberId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MemberId =>
  IdCast.castMemberId(make(id, assemblyId, create, TableId.MethodDef));

export const makeTypeSpecId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.TypeSpecId =>
  IdCast.castTypeSpecId(make(id, assemblyId, create, TableId.TypeSpec));
export const makeMethodSpecId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MethodSpecId =>
  IdCast.castMethodSpecId(make(id, assemblyId, create, TableId.MethodSpec));

export const makeGenericParamId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.GenericParamId =>
  IdCast.castGenericParamId(make(id, assemblyId, create, TableId.GenericParam));

// ---

const makeBoxed = (id: number, boxedId: BoxedId) => id + ((boxedId as number) << 24);

export const makeAssemblyId = (id: number): Id.AssemblyId => IdCast.castAssemblyId(makeBoxed(id, BoxedId.Assembly));
export const makeNamespaceId = (id: number): Id.NamespaceId => IdCast.castNamespaceId(makeBoxed(id, BoxedId.Namespace));

export const makeAssemblyGroupId = (id: number): Id.AssemblyGroupId =>
  IdCast.castAssemblyGroupId(makeBoxed(id, BoxedId.AssemblyGroup));
export const makeNamespaceGroupId = (id: number): Id.NamespaceGroupId =>
  IdCast.castNamespaceGroupId(makeBoxed(id, BoxedId.NamespaceGroup));
