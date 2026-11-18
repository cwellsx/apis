import * as Dotnet from "../contracts-dotnet";
import { WithoutNameAndMetadataToken } from "./schemaMemberJson";

export const getFieldMemberJson = (value: Dotnet.FieldMember): WithoutNameAndMetadataToken<Dotnet.FieldMember> => ({
  fieldType: value.fieldType,
  access: value.access,
  isStatic: value.isStatic,
  attributes: value.attributes,
});

export const getEventMemberJson = (value: Dotnet.EventMember): WithoutNameAndMetadataToken<Dotnet.EventMember> => ({
  eventHandlerType: value.eventHandlerType,
  access: value.access,
  isStatic: value.isStatic,
  attributes: value.attributes,
});

export const getPropertyMemberJson = (
  value: Dotnet.PropertyMember
): WithoutNameAndMetadataToken<Dotnet.PropertyMember> => ({
  propertyType: value.propertyType,
  access: value.access,
  isStatic: value.isStatic,
  parameters: value.parameters,
  attributes: value.attributes,
});

export const getMethodMemberJson = (value: Dotnet.MethodMember): WithoutNameAndMetadataToken<Dotnet.MethodMember> => ({
  access: value.access,
  isStatic: value.isStatic,
  isConstruct: value.isConstruct,
  genericParameters: value.genericParameters,
  parameters: value.parameters,
  returnType: value.returnType,
  attributes: value.attributes,
});
