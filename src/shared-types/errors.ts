import type { BadMethodInfo } from "./loaded";
import { MethodName } from "./methodName";

export type BadMethodInfoAndNames = BadMethodInfo & Omit<MethodName, "assemblyName">;

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
