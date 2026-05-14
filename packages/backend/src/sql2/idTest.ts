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

export const isTableId = (id: number, tableId: TableId): boolean => (id & 0xff000000) == (tableId as number) << 24;

const strip = (id: bigint): number => Number(id & 0xffffffffn);
export const isTypeDefId = (id: TypeId): id is TypeDefId => isTableId(strip(id), TableId.TypeDef);
export const isGenericParamId = (id: TypeId): id is GenericParamId => isTableId(strip(id), TableId.GenericParam);
export const isMethodDefId = (id: AnyOwnerId): id is MethodDefId => isTableId(strip(id), TableId.MethodDef);

export const enum BoxedId {
  Assembly = 0x40,
  Namespace = 0x41,
  AssemblyGroup = 0x80,
  NamespaceGroup = 0x81,
}
