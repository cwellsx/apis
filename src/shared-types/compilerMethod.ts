import { MethodName } from "./methodName";

// same as CompilerMethodColumns except with string instead of number
export type CompilerMethod = {
  assemblyName: string;
  compilerNamespace: string;
  compilerType: string;
  compilerMethod: string;
  compilerTypeId: number;
  compilerMethodId: number;
  ownerNamespace: string;
  ownerType: string;
  ownerMethod: string;
  declaringType: string; // used to assert that declaringType matches ownerType
  callStack: MethodName[] | undefined;
  error: string | undefined;
  info: string | undefined;
};

export type LocalsType = {
  assemblyName: string;
  ownerType: string;
  ownerMethod: string;
  compilerType: string;
};
