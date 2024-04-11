import { TextNode } from "./textNode";

export type Access = "public" | "protected" | "internal" | "private";

export type Exception = TextNode;
export type Exceptions = Exception[];

export type MemberInfo = TextNode & {
  attributes: TextNode[];
  access: Access;
};

export type Members = {
  fieldMembers: MemberInfo[];
  eventMembers: MemberInfo[];
  propertyMembers: MemberInfo[];
  methodMembers: MemberInfo[];
};

export type TypeKnown = TextNode & {
  access: Access;
  attributes: TextNode[];
  subtypes?: Type[];
  members: Members;
};

// if there was an exception when reading the type then only display the exception and not other data,
// because other data (e.g. the Access) might be missing, which would take more effort to handle safely
export type TypeException = TextNode & {
  exceptions: Exceptions;
};

export function isTypeException(type: Type): type is TypeException {
  return (type as TypeException).exceptions !== undefined;
}

export type Type = TypeKnown | TypeException;

export type Namespace = TextNode & {
  types: Type[];
};

export type Types = {
  namespaces: Namespace[];
  exceptions: Exceptions;
};
