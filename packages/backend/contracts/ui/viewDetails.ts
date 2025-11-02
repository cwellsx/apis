import { BadMethodCall } from "./dotnet";
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

export type DetailedCustom = {
  id: string; // the name of the Coclass
  layer: string; // the path in which the project is contained
  details: string[]; // the name[s] and method declarations of the Coclass' interface[s]
  detailType: "customDetails";
};

export type DetailType = "methodDetails" | "assemblyDetails" | "customDetails";

export type ViewDetails = DetailedMethod | DetailedAssembly | DetailedCustom;
