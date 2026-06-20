import { assert } from "../utils";
import { BoxedId, isTableId, TableId } from "./idTest";
import type * as Id from "./idTypes";

const castAssemblyId = (id: number): Id.AssemblyId => id as Id.AssemblyId;
const castNamespaceId = (id: number): Id.NamespaceId => id as Id.NamespaceId;
const castAssemblyGroupId = (id: number): Id.AssemblyGroupId => id as Id.AssemblyGroupId;
const castNamespaceGroupId = (id: number): Id.NamespaceGroupId => id as Id.NamespaceGroupId;
const castViewId = (id: number): Id.ViewId => id as Id.ViewId;
export const castCustomId = (id: number): Id.CustomId => id as Id.CustomId;
const castTypeDefId = (id: bigint): Id.TypeDefId => id as Id.TypeDefId;
const castTypeSpecId = (id: bigint): Id.TypeSpecId => id as Id.TypeSpecId;
const castGenericParamId = (id: bigint): Id.GenericParamId => id as Id.GenericParamId;
const castMethodDefId = (id: bigint): Id.MethodDefId => id as Id.MethodDefId;
const castMethodSpecId = (id: bigint): Id.MethodSpecId => id as Id.MethodSpecId;
const castMemberId = (id: bigint): Id.MemberId => id as Id.MemberId;
const castAnyId = (id: bigint): Id.AnyId => id as Id.TypeDefId;

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
  castTypeDefId(make(id, assemblyId, create, TableId.TypeDef));
export const makeMethodDefId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MethodDefId =>
  castMethodDefId(make(id, assemblyId, create, TableId.MethodDef));

export const makeFieldMemberId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MemberId =>
  castMemberId(make(id, assemblyId, create, TableId.Field));
export const makeEventMemberId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MemberId =>
  castMemberId(make(id, assemblyId, create, TableId.Event));
export const makePropertyMemberId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MemberId =>
  castMemberId(make(id, assemblyId, create, TableId.Property));
export const makeMethodMemberId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MemberId =>
  castMemberId(make(id, assemblyId, create, TableId.MethodDef));

export const makeTypeSpecId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.TypeSpecId =>
  castTypeSpecId(make(id, assemblyId, create, TableId.TypeSpec));
export const makeMethodSpecId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.MethodSpecId =>
  castMethodSpecId(make(id, assemblyId, create, TableId.MethodSpec));

export const makeGenericParamId = (id: number, assemblyId: Id.AssemblyId, create: boolean): Id.GenericParamId =>
  castGenericParamId(make(id, assemblyId, create, TableId.GenericParam));

// ---

const makeBoxed = (id: number, boxedId: BoxedId) => id + ((boxedId as number) << 24);

export const makeAssemblyId = (id: number): Id.AssemblyId => castAssemblyId(makeBoxed(id, BoxedId.Assembly));
export const makeNamespaceId = (id: number): Id.NamespaceId => castNamespaceId(makeBoxed(id, BoxedId.Namespace));

export const makeAssemblyGroupId = (id: number): Id.AssemblyGroupId =>
  castAssemblyGroupId(makeBoxed(id, BoxedId.AssemblyGroup));
export const makeNamespaceGroupId = (id: number): Id.NamespaceGroupId =>
  castNamespaceGroupId(makeBoxed(id, BoxedId.NamespaceGroup));

export const zero = {
  // number
  assemblyId: castAssemblyId(0),
  namespaceId: castNamespaceId(0),
  assemblyGroupId: castAssemblyGroupId(0),
  namespaceGroupId: castNamespaceGroupId(0),
  viewId: castViewId(0),
  // bigint
  typeDefId: castTypeDefId(0n),
  typeSpecId: castTypeSpecId(0n),
  genericParamId: castGenericParamId(0n),

  typeId: castTypeSpecId(0n),
  methodDefId: castMethodDefId(0n),
  methodSpecId: castMethodSpecId(0n),
  methodId: castMethodDefId(0n),
  memberId: castMemberId(0n),
  anyId: castAnyId(0n),
};
