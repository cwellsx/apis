//import type { BadMethodInfo } from "../dotnet/loadedCalls"; // not dotnet/index to avoid circular dependency
import type { BadMethodInfo } from "../dotnet"; // not dotnet/index to avoid circular dependency
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
