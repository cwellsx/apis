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
  // each record contains MethodDetails for a single method, application reads several methods at a time
  assemblyName: string;
  metadataToken: number;
  typeMetadataToken: number;
  memberType: keyof Members;
  memberInfo: string;
};

export type MethodColumns = {
  // each record contains MethodDetails for a single method, application reads several methods at a time
  assemblyName: string;
  metadataToken: number;
  methodDetails: string;
};

export type ErrorColumns = {
  assemblyName: string;
  badTypeInfos: string;
  badCallDetails: string;
};

export type CallColumns = {
  // this could be refactored as one table with three or four columns, plus a join table
  fromAssemblyName: string;
  fromNamespace: string;
  fromTypeId: number;
  fromMethodId: number;
  toAssemblyName: string;
  toNamespace: string;
  toTypeId: number;
  toMethodId: number;
};

export type TypeNameColumns = {
  assemblyName: string;
  metadataToken: number;
  namespace: string | null;
  decoratedName: string;
  wantedTypeId: number | null;
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
