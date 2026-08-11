import { MethodName } from "./methodName";
import { Namespace } from "./types";

/*
  The types of ViewDetails are distinguished by the detailType
*/

export type DetailedMethod = { title: MethodName; asText: string; detailType: "methodDetails" };

export type DetailedAssembly = { namespaces: Namespace[]; detailType: "assemblyDetails" };

export type DetailedCustom = {
  id: string; // the name of the Coclass
  layer: string; // the path in which the project is contained
  details: string[]; // the name[s] and method declarations of the Coclass' interface[s]
  detailType: "customDetails";
};

export type ViewDetails = DetailedMethod | DetailedAssembly | DetailedCustom;
export type DetailType = ViewDetails["detailType"];
