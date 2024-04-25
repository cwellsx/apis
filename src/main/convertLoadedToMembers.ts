import type { Access, MemberInfo, Members, TextNode } from "../shared-types";
import type { EventMember, FieldMember, MethodMember, Parameter, PropertyMember, TypeId } from "./loaded";
import { Access as LoadedAccess, Members as LoadedMembers } from "./loaded";
import { options } from "./shared-types";

type IdKind = "!n!" | "!t!" | "!e!" | "!a!";
type MemberIdKind = "!mm!" | "!mf!" | "!mp!" | "!me!";
export const getId = (kind: IdKind | MemberIdKind, id: number | string): string => `${kind}${id}`;

export const getMethodId = (id: string): number | undefined => (id.startsWith("!mm!") ? +id.substring(4) : undefined);

export const getTypeName = (name: string, generic?: TypeId[]): string => {
  if (!generic) return name;
  const index = name.indexOf("`");
  return (index === -1 ? name : name.substring(0, index)) + `<${generic.map((it) => it.name).join(",")}>`;
};
const getTypeIdName = (typeId: TypeId): string => getTypeName(typeId.name, typeId.genericTypeArguments);

export const getAttributes = (attributes: string[] | undefined, containerId: number): TextNode[] => {
  const parseAttribute = (attribute: string): { namespace?: string; name: string; args?: string } => {
    if (attribute[0] != "[" || attribute[attribute.length - 1] != "]")
      throw new Error(`Unexpected attribute ${attribute}`);
    attribute = attribute.substring(1, attribute.length - 1);
    const paren = attribute.indexOf("(");
    const [first, args] =
      paren == -1
        ? [attribute, undefined]
        : [attribute.substring(0, paren), attribute.substring(paren + 1, attribute.length - 1)];
    const dot = first.lastIndexOf(".");
    const [namespace, name] = dot == -1 ? [undefined, attribute] : [first?.substring(0, dot), first.substring(dot + 1)];
    return { namespace, name, args };
  };
  const filterAttributes = (attributes: string[]): string[] => {
    const result: string[] = [];
    for (const attribute of attributes) {
      try {
        const { namespace, name, args } = parseAttribute(attribute);
        if (
          !options.compilerAttributes &&
          (namespace == "System.Runtime.CompilerServices" ||
            name == "AttributeUsageAttribute" ||
            name == "EmbeddedAttribute")
        )
          continue;

        const text = !args
          ? name
          : // some attributes have long parameters which aren't interesting to display
          name == "ObsoleteAttribute" || name == "DebuggerBrowsableAttribute"
          ? `${name}(…)`
          : `${name}(${args})`;
        result.push(`[${text}]`);
      } catch {
        continue;
      }
    }
    return result;
  };

  if (!attributes) return [];
  return filterAttributes(attributes).map((attribute) => {
    return {
      label: attribute,
      id: getId("!a!", `${containerId}!${attribute}`),
    };
  });
};

export const getAccess = (access: LoadedAccess): Access => {
  switch (access) {
    case LoadedAccess.Public:
      return "public";
    case LoadedAccess.ProtectedInternal:
    case LoadedAccess.Protected:
      return "protected";
    case LoadedAccess.Internal:
      return "internal";
    case LoadedAccess.PrivateProtected:
    case LoadedAccess.Private:
      return "private";
  }
};

const getGenericName = (name: string, genericArguments: TypeId[] | undefined): string =>
  !genericArguments ? name : `${name}<${genericArguments.map(getTypeIdName).join(", ")}>`;

export const getMethodName = (methodMember: MethodMember): string => {
  const getName = (name: string, parameters: Parameter[] | undefined): string =>
    !parameters ? name : `${name}(${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")})`;
  return getName(getGenericName(methodMember.name, methodMember.genericArguments), methodMember.parameters);
};

const getPropertyName = (propertyMember: PropertyMember): string => {
  const getName = (name: string, parameters: Parameter[] | undefined): string =>
    !parameters ? name : `${name}[${parameters.map((parameter) => getTypeIdName(parameter.type)).join(", ")}]`;
  return getName(propertyMember.name, propertyMember.parameters);
};

const getFromName = (
  id: string,
  name: string,
  attributes: TextNode[],
  memberTypeId: TypeId | undefined, // undefined iff it's a constructor
  access: LoadedAccess
): MemberInfo => {
  const label = !memberTypeId ? name : `${name} : ${getTypeIdName(memberTypeId)}`;
  return {
    label,
    id,
    attributes,
    access: getAccess(access),
  };
};

const getFieldMember = (fieldMember: FieldMember): MemberInfo =>
  getFromName(
    getId("!mf!", fieldMember.metadataToken),
    fieldMember.name,
    getAttributes(fieldMember.attributes, fieldMember.metadataToken),
    fieldMember.fieldType,
    fieldMember.access
  );
const getEventMember = (eventMember: EventMember): MemberInfo =>
  getFromName(
    getId("!me!", eventMember.metadataToken),
    eventMember.name,
    getAttributes(eventMember.attributes, eventMember.metadataToken),
    eventMember.eventHandlerType,
    eventMember.access
  );
const getPropertyMember = (propertyMember: PropertyMember): MemberInfo =>
  getFromName(
    getId("!mp!", propertyMember.metadataToken),
    getPropertyName(propertyMember),
    getAttributes(propertyMember.attributes, propertyMember.metadataToken),
    propertyMember.propertyType,
    propertyMember.access
  );
const getMethodMember = (methodMember: MethodMember): MemberInfo =>
  getFromName(
    getId("!mm!", methodMember.metadataToken),
    getMethodName(methodMember),
    getAttributes(methodMember.attributes, methodMember.metadataToken),
    methodMember.returnType,
    methodMember.access
  );

export const getMembers = (members: LoadedMembers): Members => ({
  fieldMembers: members.fieldMembers?.map(getFieldMember) ?? [],
  eventMembers: members.eventMembers?.map(getEventMember) ?? [],
  propertyMembers: members.propertyMembers?.map(getPropertyMember) ?? [],
  methodMembers: members.methodMembers?.map(getMethodMember) ?? [],
});
