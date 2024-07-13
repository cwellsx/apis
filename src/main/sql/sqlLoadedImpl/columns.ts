import type { ClusterBy, NodeId } from "../../../shared-types";
import type { BadMethodInfo, BadTypeInfo, Members, MethodInfo } from "../../loaded";
import { CommonGraphViewType } from "../sqlLoadedApiTypes";
import type { SavedTypeInfo } from "./savedTypeInfo";

export type BadMethodInfoAndIds = BadMethodInfo & { methodId: number; typeId: number };
export type CompilerMethodError = "Multiple Callers" | "No Callers" | null;

/*
  This defines types used by most of the SQL source, and imports types from elsewhere -- avoid circular dependencies

  Mapping from methodId to its typeId is defined on save by the getMethodTypeId method,
  and stored denormalized in tables which need this mapping.
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
  // each record contains all MethodInfo for a single method
  assemblyName: string;
  metadataToken: number;
  methodInfo: MethodInfo;
};

export type ErrorColumns = {
  assemblyName: string;
  badTypeInfos: BadTypeInfo[];
  badMethodInfos: BadMethodInfoAndIds[];
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
  isCompilerType: 0 | 1; // "SQLite3 can only bind numbers, strings, bigints, buffers, and null"
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
export type CompilerMethodColumns = {
  assemblyName: string;
  compilerType: number; // not used much at run-time except to display in ViewCompiler
  compilerMethod: number;
  ownerType: number;
  ownerNamespace: string | null;
  ownerMethod: number;
  info: string | null;
  error: CompilerMethodError;
};

// this table too helps to implement compilerMethods module
export type LocalsTypeColumns = {
  assemblyName: string;
  ownerType: number;
  ownerNamespace: string | null;
  ownerMethod: number;
  compilerType: number;
};
