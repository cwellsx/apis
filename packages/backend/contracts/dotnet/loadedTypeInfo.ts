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
  typeId: TypeId; // normally defined if it's good
  attributes?: string[];
  baseType?: TypeId;
  interfaces?: TypeId[];
  genericTypeParameters?: TypeId[];
  access: Access; // normally defined if it's good
  flag?: Flag;
  members: Members; // normally defined if it's good
};
