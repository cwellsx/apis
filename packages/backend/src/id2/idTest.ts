import { assert } from "../utils";
import {
  AnyBigId,
  AnyOwnerId,
  BaseTypeId,
  CallToId,
  GenericParamId,
  MethodDefId,
  TypeDefId,
  TypeId,
  TypeSpecId,
} from "./idTypes";
import { BoxedId, isTableId, TableId } from "./tables";

const strip = (id: bigint): number => Number(id & 0xffffffffn);

export const isTypeDefId = (id: AnyBigId): id is TypeDefId => isTableId(strip(id), TableId.TypeDef);
export const isGenericParamId = (id: TypeId): id is GenericParamId => isTableId(strip(id), TableId.GenericParam);

export const isMethodDefId = (id: AnyOwnerId): id is MethodDefId => isTableId(strip(id), TableId.MethodDef);
export const isMethodSpecId = (id: AnyOwnerId): id is MethodDefId => isTableId(strip(id), TableId.MethodSpec);

export const isBaseTypeId = (id: TypeId): id is BaseTypeId => isTypeDefId(id) || isGenericParamId(id);
export const isTypeSpecId = (id: TypeId): id is TypeSpecId => isTableId(strip(id), TableId.TypeSpec);

export const isOwnerTypeSpecId = (id: AnyOwnerId): id is TypeSpecId => isTableId(strip(id), TableId.TypeSpec);
export const isOwnerMethodSpecId = (id: AnyOwnerId): id is TypeSpecId => isTableId(strip(id), TableId.MethodSpec);
export const isOwnerMethodDefId = (id: AnyOwnerId): id is TypeSpecId => isTableId(strip(id), TableId.MethodDef);

export const isCallToId = (toId: CallToId): "A" | "N" | "T" | "M" => {
  const id = strip(toId);
  if (isTableId(id, BoxedId.Assembly)) return "A";
  if (isTableId(id, BoxedId.Namespace)) return "N";
  if (isTableId(id, TableId.TypeDef) || isTableId(id, TableId.TypeSpec)) return "T";
  if (isTableId(id, TableId.MethodDef) || isTableId(id, TableId.MethodSpec)) return "M";
  assert(false);
};

// for diagnostics, where the caller cannot assert: which kind of id is this?
// ids are packed as (assemblyId << 32) + token, and the token's high byte identifies its table
export const describeId = (id: bigint): string => {
  const token = strip(id);
  if (isTableId(token, BoxedId.Assembly)) return "assembly";
  if (isTableId(token, BoxedId.Namespace)) return "namespace";
  if (isTableId(token, TableId.TypeDef)) return "typeDef";
  if (isTableId(token, TableId.TypeSpec)) return "typeSpec";
  if (isTableId(token, TableId.MethodDef)) return "methodDef";
  if (isTableId(token, TableId.MethodSpec)) return "methodSpec";
  if (isTableId(token, TableId.GenericParam)) return "genericParam";
  if (isTableId(token, BoxedId.Group)) return "group";
  return `unknown(0x${token.toString(16)})`;
};
