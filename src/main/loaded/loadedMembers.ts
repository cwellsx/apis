import { Access } from "./loadedAccess";
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
};

export type EventMember = {
  name: string;
  attributes?: string[];
  access: Access;
  eventHandlerType: TypeId;
  isStatic?: boolean;
};

export type PropertyMember = {
  name: string;
  attributes?: string[];
  access: Access;
  parameters?: Parameter[];
  propertyType: TypeId;
  isStatic?: boolean;
};

export type ConstructorMember = {
  attributes?: string[];
  access: Access;
  parameters?: Parameter[];
  isStatic?: boolean;
};

export type MethodMember = {
  name: string;
  attributes?: string[];
  access: Access;
  parameters?: Parameter[];
  isStatic?: boolean;
  genericArguments?: TypeId[];
  returnType: TypeId;
};

export type Members = {
  fieldMembers?: FieldMember[];
  eventMembers?: EventMember[];
  propertyMembers?: PropertyMember[];
  constructorMembers?: ConstructorMember[];
  methodMembers?: MethodMember[];
};
