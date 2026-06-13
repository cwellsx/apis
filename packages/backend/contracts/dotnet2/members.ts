import { Access } from "./access";
import { GenericParam, MetadataToken, TypeId } from "./id";

export type Parameter = { name: string; type: TypeId };

export type FieldMember = {
  name: string;
  fieldType: TypeId;
  access: Access;
  isStatic?: boolean;
  attributes?: string[];
  metadataToken: MetadataToken;
};

export type EventMember = {
  name: string;
  eventHandlerType: TypeId;
  access: Access;
  isStatic?: boolean;
  attributes?: string[];
  metadataToken: MetadataToken;
};

export type PropertyMember = {
  name: string;
  propertyType: TypeId;
  access: Access;
  isStatic?: boolean;
  parameters?: Parameter[];
  attributes?: string[];
  metadataToken: MetadataToken;
};

export type MethodMember = {
  name: string;
  access: Access;
  isStatic?: boolean;
  isConstruct?: boolean;
  genericParameters?: GenericParam[];
  parameters?: Parameter[];
  returnType: TypeId;
  attributes?: string[];
  metadataToken: MetadataToken;
};
