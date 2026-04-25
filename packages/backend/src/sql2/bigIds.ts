// number

import { assert } from "../utils";

export type AssemblyId = number & { __brand: "AssemblyId" };
export type NamespaceId = number & { __brand: "NamespaceId" };
export type ViewId = number & { __brand: "ViewId" };

// bigint

export type TypeDefId = bigint & { __brand: "TypeDefId" };
export type MethodId = bigint & { __brand: "MethodId" };
export type MemberId = bigint & { __brand: "MemberId" };

export type AnyId = TypeDefId | MethodId;

// cast

export const castAssemblyId = (id: number): AssemblyId => id as AssemblyId;
export const castNamespaceId = (id: number): NamespaceId => id as NamespaceId;
export const castViewId = (id: number): ViewId => id as ViewId;

export const castTypeDefId = (id: bigint): TypeDefId => id as TypeDefId;
export const castMethodId = (id: bigint): MethodId => id as MethodId;
export const castMemberId = (id: bigint): MemberId => id as MemberId;

export const castMAnyId = (id: bigint): AnyId => id as TypeDefId;

// TableId

const enum TableId {
  TypeRef = 0x01,
  TypeDef = 0x02,
  Field = 0x04,
  MethodDef = 0x06,
  MemberRef = 0x0a,
  Event = 0x14,
  Property = 0x17,
}

const isTableId = (id: number, tableId: TableId): boolean => (id & 0xff000000) == (tableId as number) << 24;
const assertTableId = (id: number, tableId: TableId) => assert(isTableId(id, tableId));

// pack

const pack = (id: number, assemblyId: AssemblyId): bigint => (BigInt(assemblyId) << 32n) + BigInt(id);

export const packTypeDefId = (id: number, assemblyId: AssemblyId): TypeDefId => {
  assertTableId(id, TableId.TypeDef);
  return castTypeDefId(pack(id, assemblyId));
};
export const packMethodId = (id: number, assemblyId: AssemblyId): MethodId => castMethodId(pack(id, assemblyId));
export const packMemberId = (id: number, assemblyId: AssemblyId): MemberId => castMemberId(pack(id, assemblyId));
