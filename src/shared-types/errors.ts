import type { BadMethodInfo } from "./loaded";
import { MethodNameStrings } from "./methodNameStrings";

export type BadMethodInfoAndNames = BadMethodInfo & Omit<MethodNameStrings, "assemblyName">;

export type BadTypeInfoAndNames = {
  typeName: string;
  exceptions: string[];
  memberExceptions: { memberName: string; exception: string }[];
};

export type ErrorsInfo = {
  assemblyName: string;
  anonTypeInfos: string[]; // exceptions without TypeId
  badTypeInfos: BadTypeInfoAndNames[]; // exceptions with TypeId
  badMethodInfos: BadMethodInfoAndNames[];
};
