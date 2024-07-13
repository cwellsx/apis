import { Access } from "./loadedEnums";
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
type AnonTypeInfo = {
  exceptions: string[];
};

// if an exception is thrown when reading members, then members are missing but at least the TypeId exists
type PartTypeInfo = {
  typeId: TypeId;
  exceptions: string[];
  // plus some of the optional fields from GoodTypeInfo
  genericTypeParameters?: TypeId[];
  attributes?: string[];
};

// the TypeInfo array may be a micture of good, bad, and very bad (i.e. anonymous) instances
export type TypeInfo = GoodTypeInfo | PartTypeInfo | AnonTypeInfo;

export type BadTypeInfo = PartTypeInfo | AnonTypeInfo;
export type NamedTypeInfo = PartTypeInfo | GoodTypeInfo;

function isBadTypeInfo(typeInfo: TypeInfo): typeInfo is AnonTypeInfo | PartTypeInfo {
  return (typeInfo as AnonTypeInfo).exceptions !== undefined || (typeInfo as PartTypeInfo).exceptions !== undefined;
}

export function isPartTypeInfo(typeInfo: TypeInfo): typeInfo is PartTypeInfo {
  return isBadTypeInfo(typeInfo) && (typeInfo as PartTypeInfo).typeId !== undefined;
}

export type AllTypeInfo = {
  good: GoodTypeInfo[];
  part: PartTypeInfo[];
  anon: AnonTypeInfo[];
};

export const validateTypeInfo = (types: TypeInfo[]): AllTypeInfo => {
  const good: GoodTypeInfo[] = [];
  const part: PartTypeInfo[] = [];
  const anon: AnonTypeInfo[] = [];
  types.forEach((type) => {
    if (!isBadTypeInfo(type)) good.push(type);
    else if (isPartTypeInfo(type)) part.push(type);
    else anon.push(type);
  });

  return { good, part, anon };
};

export const badTypeInfo = (all: AllTypeInfo): BadTypeInfo[] => {
  const result: (PartTypeInfo | AnonTypeInfo)[] = [];
  result.push(...all.anon);
  result.push(...all.part);
  return result;
};

export const namedTypeInfo = (all: AllTypeInfo): NamedTypeInfo[] => {
  const result: (PartTypeInfo | GoodTypeInfo)[] = [];
  result.push(...all.good);
  result.push(...all.part);
  return result;
};
