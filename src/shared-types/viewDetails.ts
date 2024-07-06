import { LoadedMethodError } from "./loaded";
import { Named, Namespace } from "./types";

/*
  The types of ViewDetails are distinguished by the detailType
*/

export type MethodNameStrings = {
  methodMember: string;
  declaringType: string;
  assemblyName: string;
};

export type DetailedMethod = {
  title: MethodNameStrings;
  asText: string;
  errors?: LoadedMethodError[];
  detailType: "methodDetails";
};

export type DetailedAssembly = {
  // assemblyId is needed because metadataToken is only unique within a given assembly
  // so if in future you want to return types from multiple assemblies:
  // - generate IDs that that globally unique, to replace metadataToken
  // - concatenate assemblyId with metadataToken
  // - or return multiple Types instances
  namespaces: Namespace[];
  exceptions: Named[];
  detailType: "assemblyDetails";
};

export type DetailType = "methodDetails" | "assemblyDetails";

export type ViewDetails = DetailedMethod | DetailedAssembly;
