import { AnyOwnerId, BaseTypeId, GenericParamId, MethodDefId, TypeDefId, TypeId, TypeSpecId } from "./idTypes";

export const enum TableId {
  // TypeRef = 0x01,
  TypeDef = 0x02,
  Field = 0x04,
  MethodDef = 0x06,
  // MethodRef = 0x0a,
  Event = 0x14,
  Property = 0x17,
  TypeSpec = 0x1b,
  GenericParam = 0x2a,
  MethodSpec = 0x2b,
}

export const isTableId = (id: number, tableId: TableId): boolean => (id & 0xff000000) == (tableId as number) << 24;

export const strip = (id: bigint): number => Number(id & 0xffffffffn);

export const isTypeDefId = (id: TypeId): id is TypeDefId => isTableId(strip(id), TableId.TypeDef);
export const isGenericParamId = (id: TypeId): id is GenericParamId => isTableId(strip(id), TableId.GenericParam);

export const isMethodDefId = (id: AnyOwnerId): id is MethodDefId => isTableId(strip(id), TableId.MethodDef);
export const isMethodSpecId = (id: AnyOwnerId): id is MethodDefId => isTableId(strip(id), TableId.MethodSpec);

export const isBaseTypeId = (id: TypeId): id is BaseTypeId => isTypeDefId(id) || isGenericParamId(id);
export const isTypeSpecId = (id: TypeId): id is TypeSpecId => isTableId(strip(id), TableId.TypeSpec);
export const isOwnerTypeSpecId = (id: AnyOwnerId): id is TypeSpecId => isTableId(strip(id), TableId.TypeSpec);

export const enum BoxedId {
  Assembly = 0x40,
  Namespace = 0x41,
  AssemblyGroup = 0x80,
  NamespaceGroup = 0x81,
}
