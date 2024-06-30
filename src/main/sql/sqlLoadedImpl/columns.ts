import type { ClusterBy, CommonGraphViewType, NodeId } from "../../../shared-types";
import type { BadCallDetails, BadTypeInfo, Members, MethodDetails } from "../../loaded";
import type { SavedTypeInfo } from "./savedTypeInfo";

/*
  This defines types used by most of the SQL source, and imports types from elsewhere -- avoid circular dependencies
*/

export type AssemblyColumns = {
  assemblyName: string;
  references: string[]; // array of names of referenced assemblies
};

export type TypeColumns = {
  assemblyName: string;
  metadataToken: number; // Id of Type within assembly
  typeInfo: SavedTypeInfo;
};

export type MemberColumns = {
  assemblyName: string;
  metadataToken: number;
  typeMetadataToken: number;
  memberType: keyof Members;
  memberInfo: string; // FieldMember[] | EventMember[] | etc.
};

export type MethodColumns = {
  // each record contains all MethodDetails for a single method
  assemblyName: string;
  metadataToken: number;
  methodDetails: MethodDetails;
};

export type ErrorColumns = {
  assemblyName: string;
  badTypeInfos: BadTypeInfo[];
  badCallDetails: BadCallDetails[];
};

export type LoadedCall = {
  fromAssemblyName: string;
  fromMethodId: number;
  toAssemblyName: string;
  toMethodId: number;
};

export type CallColumns = LoadedCall & {
  // this could be refactored as one table with three or four columns, plus a join table
  fromNamespace: string;
  fromTypeId: number;
  toNamespace: string;
  toTypeId: number;
};

export type TypeNameColumns = {
  assemblyName: string;
  metadataToken: number;
  namespace: string | null;
  decoratedName: string;
};

export type MethodNameColumns = {
  assemblyName: string;
  metadataToken: number;
  name: string;
};

export type GraphFilterColumns = {
  viewType: CommonGraphViewType;
  clusterBy: ClusterBy | "leafVisible";
  nodeIds: NodeId[];
};

export type DeclaringTypeColumns = {
  assemblyName: string;
  nestedType: number;
  declaringType: number;
};

// this table is used to avoid calls to compiler-generated nested types e.g. for anonymous predicates
export type WantedTypeColumns = {
  assemblyName: string;
  nestedType: number;
  wantedType: number;
  wantedNamespace: string | null;
  wantedMethod: number;
  calledFrom: { fromMethodId: number; toMethodId: number }[];
  errors: string[] | null;
};
