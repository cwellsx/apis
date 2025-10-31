import { Access } from "./loadedEnums";
import { Members } from "./loadedMembers";
import { TypeId } from "./loadedTypeId";

const enum Flag {
  Generic = 1,
  GenericDefinition = 2,
  Nested = 4,
}

// this is what's defined in (and what we get from) C# -- with TypeId and without exceptions is the usual, happy path
export type TypeInfo = {
  typeId?: TypeId; // normally defined if it's good
  attributes?: string[];
  baseType?: TypeId;
  interfaces?: TypeId[];
  genericTypeParameters?: TypeId[];
  access?: Access; // normally defined if it's good
  flag?: Flag;
  members?: Members; // normally defined if it's good
  exceptions?: string[]; // normally undefined it it's good
};

// if an exception is thrown and caught, when reading the TypeInfo
// then the exceptions field is present and any other fields including the TypeId may be missing
export type AnonTypeInfo = Required<Pick<TypeInfo, "exceptions">>;
export const isAnonTypeInfo = (typeInfo: TypeInfo): typeInfo is AnonTypeInfo => typeInfo.typeId === undefined;

// if at least the TypeId is present then it's not anonymous and can be useful
export type NamedTypeInfo = TypeInfo & { typeId: TypeId };
export const isNamedTypeInfo = (typeInfo: TypeInfo): typeInfo is NamedTypeInfo => typeInfo.typeId !== undefined;

// most of the application assumes non-undefined MemberInfo (SQL layer substitutes empty MemberInfo if necessary)
export type GoodTypeInfo = NamedTypeInfo & { members: Members };
export const getMembers = (typeInfo: TypeInfo): Members => typeInfo.members ?? {};
