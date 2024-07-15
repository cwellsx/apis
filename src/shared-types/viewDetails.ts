import { BadMethodCall } from "./loaded";
import { MethodName } from "./methodName";
import { Named, Namespace } from "./types";

/*
  The types of ViewDetails are distinguished by the detailType
*/

export type DetailedMethod = {
  title: MethodName;
  asText: string;
  badMethodCalls?: BadMethodCall[];
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
