import { Named, Namespace } from "./types";

/*
  The types of ViewDetails are distinguished by the detailType
*/

export type MethodError = {
  heading: "Error" | "Warning";
  message: string;
  objects: object[];
};

export type MethodBody = {
  title: {
    assemblyName: string;
    typeName: string;
    methodName: string;
  };
  asText: string;
  errors?: MethodError[];
  detailType: "methodBody";
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

export type DetailType = "methodBody" | "types";

export type ViewDetails = MethodBody | Types;
