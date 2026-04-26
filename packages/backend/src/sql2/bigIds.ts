// number

import { assert } from "../utils";

export type AssemblyId = number & { __brand: "AssemblyId" };
export type NamespaceId = number & { __brand: "NamespaceId" };
export type ViewId = number & { __brand: "ViewId" };

// bigint

export type TypeDefId = bigint & { __brand: "TypeDefId" };
export type TypeRefId = bigint & { __brand: "TypeRefId" };
export type GenericParamId = bigint & { __brand: "GenericParam" };

export type MethodDefId = bigint & { __brand: "MethodDefId" };
export type MethodRefId = bigint & { __brand: "MethodRefId" };
export type MemberId = bigint & { __brand: "MemberId" };

export type BaseTypeId = TypeDefId | GenericParamId;
export type TypeId = BaseTypeId | TypeRefId;
export type MethodId = MethodDefId | MethodRefId;

export type AnyDefId = TypeDefId | MethodDefId;
export type AnyOwnerId = TypeRefId | MethodRefId | MethodDefId;
export type AnyId = TypeId | MethodId;

// cast

export const castAssemblyId = (id: number): AssemblyId => id as AssemblyId;
export const castNamespaceId = (id: number): NamespaceId => id as NamespaceId;
export const castViewId = (id: number): ViewId => id as ViewId;

export const castTypeDefId = (id: bigint): TypeDefId => id as TypeDefId;
export const castTypeRefId = (id: bigint): TypeRefId => id as TypeRefId;
export const castGenericParamId = (id: bigint): GenericParamId => id as GenericParamId;

export const castMethodDefId = (id: bigint): MethodDefId => id as MethodDefId;
export const castMethodRefId = (id: bigint): MethodRefId => id as MethodRefId;
export const castMemberId = (id: bigint): MemberId => id as MemberId;

export const castMAnyId = (id: bigint): AnyId => id as TypeDefId;

// TableId

const enum TableId {
  TypeRef = 0x01,
  TypeDef = 0x02,
  Field = 0x04,
  MethodDef = 0x06,
  MethodSpec = 0x2b,
  MemberRef = 0x0a,
  Event = 0x14,
  Property = 0x17,
  GenericParam = 0x2a,
}

const isTableId = (id: number, tableId: TableId): boolean => (id & 0xff000000) == (tableId as number) << 24;
const assertTableId = (id: number, tableId: TableId) => assert(isTableId(id, tableId));

// pack

const pack = (id: number, assemblyId: AssemblyId): bigint => (BigInt(assemblyId) << 32n) + BigInt(id);

const packId = <T>(id: number, assemblyId: AssemblyId, tableId: TableId, cast: (packed: bigint) => T): T => {
  assertTableId(id, tableId);
  return cast(pack(id, assemblyId));
};

export const packTypeDefId = (id: number, assemblyId: AssemblyId): TypeDefId =>
  packId(id, assemblyId, TableId.TypeDef, castTypeDefId);
export const packTypeRefId = (id: number, assemblyId: AssemblyId): TypeRefId =>
  packId(id, assemblyId, TableId.TypeRef, castTypeRefId);
export const packGenericParamId = (id: number, assemblyId: AssemblyId): GenericParamId =>
  packId(id, assemblyId, TableId.GenericParam, castGenericParamId);
export const packMethodDefId = (id: number, assemblyId: AssemblyId): MethodDefId =>
  packId(id, assemblyId, TableId.MethodDef, castMethodDefId);
export const packMethodRefId = (id: number, assemblyId: AssemblyId): MethodRefId =>
  packId(id, assemblyId, TableId.MethodSpec, castMethodRefId);

export const packMemberId = (id: number, assemblyId: AssemblyId): MemberId => castMemberId(pack(id, assemblyId));

export const addTypeRefTableId = (id: number) => id + ((TableId.TypeRef as number) << 24);
export const addMethodRefTableId = (id: number) => id + ((TableId.MethodSpec as number) << 24);
export const addGenericParamTableId = (id: number) => id + ((TableId.GenericParam as number) << 24);
