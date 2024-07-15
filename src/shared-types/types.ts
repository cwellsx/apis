import { NodeId } from "./nodeId";

export type Named = {
  name: string;
  nodeId: NodeId; // unique within graph and/or within group tree
};

export type Access = "public" | "protected" | "internal" | "private";

export type MemberInfo = Named & {
  attributes: Named[];
  access: Access;
};

export type Members = {
  fieldMembers: MemberInfo[];
  eventMembers: MemberInfo[];
  propertyMembers: MemberInfo[];
  methodMembers: MemberInfo[];
  exceptions: MemberInfo[];
};

export type Type = Named & {
  access?: Access; // normally defined
  attributes: Named[];
  subtypes?: Type[];
  members: Members;
  exceptions: Named[]; // normally empty
};

export type Namespace = Named & {
  types: Type[];
};
