import type { BadMethodInfo, BadTypeInfo } from "./loaded";
import { MethodNameStrings } from "./methodNameStrings";

export type BadMethodInfoAndNames = BadMethodInfo & Omit<MethodNameStrings, "assemblyName">;
export type ErrorsInfo = { assemblyName: string; badTypeInfos: BadTypeInfo[]; badMethodInfos: BadMethodInfoAndNames[] };
