import { Access } from "./loadedAccess";
import { Members } from "./loadedMembers";
import { TypeId } from "./loadedTypeId";

export const enum Flag {
  Generic = 1,
  GenericDefinition = 2,
  Nested = 4,
}

// GoodTypeInfo with TypeId and without exceptions is the usual, happy path
export type GoodTypeInfo = {
  typeId: TypeId;
  attributes?: string[];
  baseType?: TypeId;
  interfaces?: TypeId[];
  genericTypeParameters?: TypeId[];
  access: Access;
  flag?: Flag;
  members: Members;
};

// if an exception is thrown and caught, when reading the TypeInfo
// then the exceptions field is present and any other fields including the TypeId may be missing
export type AnonTypeInfo = {
  exceptions: string[];
};
export type BadTypeInfo = {
  typeId: TypeId;
  exceptions: string[];
  // plus some of the optional fields from GoodTypeInfo
  genericTypeParameters?: TypeId[];
  attributes?: string[];
};

// the TypeInfo array may be a micture of good, bad, and very bad (i.e. anonymous) instances
export type NamedTypeInfo = BadTypeInfo | GoodTypeInfo;
export type TypeInfo = NamedTypeInfo | AnonTypeInfo;
export function isNamedTypeInfo(typeInfo: TypeInfo): typeInfo is NamedTypeInfo {
  return (typeInfo as NamedTypeInfo).typeId !== undefined;
}
export function isBadTypeInfo(typeInfo: NamedTypeInfo): typeInfo is BadTypeInfo {
  return (typeInfo as BadTypeInfo).exceptions !== undefined;
}
