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
};

export type TypeKnown = Named & {
  access: Access;
  attributes: Named[];
  subtypes?: Type[];
  members: Members;
};

// if there was an exception when reading the type then only display the exception and not other data,
// because other data (e.g. the Access) might be missing, which would take more effort to handle safely
export type TypeException = Named & {
  exceptions: Named[];
};

export function isTypeException(type: Type): type is TypeException {
  return (type as TypeException).exceptions !== undefined;
}

export type Type = TypeKnown | TypeException;

export type Namespace = Named & {
  types: Type[];
};

export type Types = {
  // assemblyId is needed because metadataToken is only unique within a given assembly
  // so if in future you want to return types from multiple assemblies:
  // - generate IDs that that globally unique, to replace metadataToken
  // - concatenate assemblyId with metadataToken
  // - or return multiple Types instances
  namespaces: Namespace[];
  exceptions: Named[];
  detailType: "types";
};
