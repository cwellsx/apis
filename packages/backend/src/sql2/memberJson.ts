import * as DotNet from "../../contracts/dotnet2";

// properties except name and metadataToken of "members" types are stored as JSON
export type WithoutNameAndMetadataToken<T> = Omit<T, "name" | "metadataToken">;
export type AnyDotNetMembers = DotNet.FieldMember | DotNet.EventMember | DotNet.PropertyMember | DotNet.MethodMember;
export type MembersJson = WithoutNameAndMetadataToken<AnyDotNetMembers>;

export const getFieldMemberJson = (value: DotNet.FieldMember): WithoutNameAndMetadataToken<DotNet.FieldMember> => ({
  fieldType: value.fieldType,
  access: value.access,
  isStatic: value.isStatic,
  attributes: value.attributes,
});

export const getEventMemberJson = (value: DotNet.EventMember): WithoutNameAndMetadataToken<DotNet.EventMember> => ({
  eventHandlerType: value.eventHandlerType,
  access: value.access,
  isStatic: value.isStatic,
  attributes: value.attributes,
});

export const getPropertyMemberJson = (
  value: DotNet.PropertyMember
): WithoutNameAndMetadataToken<DotNet.PropertyMember> => ({
  propertyType: value.propertyType,
  access: value.access,
  isStatic: value.isStatic,
  parameters: value.parameters,
  attributes: value.attributes,
});

export const getMethodMemberJson = (value: DotNet.MethodMember): WithoutNameAndMetadataToken<DotNet.MethodMember> => ({
  access: value.access,
  isStatic: value.isStatic,
  isConstruct: value.isConstruct,
  genericParameters: value.genericParameters,
  parameters: value.parameters,
  returnType: value.returnType,
  attributes: value.attributes,
});
