import { Access } from "./loadedEnums";
import { TypeId } from "./loadedTypeId";

export type Parameter = {
  name?: string;
  type: TypeId;
};

export type FieldMember = {
  name: string;
  attributes?: string[];
  access: Access;
  fieldType: TypeId;
  isStatic?: boolean;
  metadataToken: number;
};

export type EventMember = {
  name: string;
  attributes?: string[];
  access: Access;
  eventHandlerType: TypeId;
  isStatic?: boolean;
  metadataToken: number;
};

export type PropertyMember = {
  name: string;
  attributes?: string[];
  access: Access;
  parameters?: Parameter[];
  propertyType: TypeId;
  isStatic?: boolean;
  metadataToken: number;
};

export type MethodMember = {
  name: string;
  access: Access;
  parameters?: Parameter[];
  isStatic?: boolean;
  isConstructor?: boolean;
  genericArguments?: TypeId[];
  returnType: TypeId;
  attributes?: string[];
  metadataToken: number;
};

export type MemberException = {
  name: string;
  metadataToken: number;
  exception: string;
};

export type Members = {
  fieldMembers?: FieldMember[];
  eventMembers?: EventMember[];
  propertyMembers?: PropertyMember[];
  methodMembers?: MethodMember[];
  exceptions?: MemberException[];
};
