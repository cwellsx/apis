import type { ClusterBy, CommonGraphViewType } from "../../../shared-types";
import type { Members } from "../../loaded";

export type AssemblyColumns = {
  assemblyName: string;
  // JSON-encoded array of names of referenced assemblies
  references: string;
};

export type TypeColumns = {
  assemblyName: string;
  metadataToken: number; // Id of Type within assembly
  typeInfo: string;
};

export type MemberColumns = {
  assemblyName: string;
  metadataToken: number;
  typeMetadataToken: number;
  memberType: keyof Members;
  memberInfo: string;
};

export type MethodColumns = {
  // each record contains all MethodDetails for a single method
  assemblyName: string;
  metadataToken: number;
  methodDetails: string;
};

export type ErrorColumns = {
  assemblyName: string;
  badTypeInfos: string;
  badCallDetails: string;
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
  //wantedTypeId: number | null;
};

export type MethodNameColumns = {
  assemblyName: string;
  metadataToken: number;
  name: string;
};

export type GraphFilterColumns = {
  viewType: CommonGraphViewType;
  clusterBy: ClusterBy | "leafVisible";
  value: string;
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
  wantedNamespace: string | undefined;
  wantedMethod: number;
};
