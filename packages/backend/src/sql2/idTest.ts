import { AnyOwnerId, GenericParamId, MethodDefId, TypeDefId, TypeId } from "./idTypes";

export const enum TableId {
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

// assemblyId begins at 1 and namespaceId begins at 1000001
export const namespaceOffset = 1000000;

export const isTableId = (id: number, tableId: TableId): boolean => (id & 0xff000000) == (tableId as number) << 24;

const strip = (id: bigint): number => Number(id & 0xffffffffn);
export const isTypeDefId = (id: TypeId): id is TypeDefId => isTableId(strip(id), TableId.TypeDef);
export const isGenericParamId = (id: TypeId): id is GenericParamId => isTableId(strip(id), TableId.GenericParam);
export const isMethodDefId = (id: AnyOwnerId): id is MethodDefId => isTableId(strip(id), TableId.MethodDef);
