import type { BadMethodInfo } from "./loaded";
import { MethodNameStrings } from "./methodNameStrings";

export type BadMethodInfoAndNames = BadMethodInfo & Omit<MethodNameStrings, "assemblyName">;
export type MemberExceptionAndNames = { exception: string } & Omit<MethodNameStrings, "assemblyName">;

export type BadTypeInfoAndNames = {
  typeName?: string;
  exceptions: string[];
  memberExceptions: MemberExceptionAndNames[];
};

export type ErrorsInfo = {
  assemblyName: string;
  badTypeInfos: BadTypeInfoAndNames[];
  badMethodInfos: BadMethodInfoAndNames[];
};
