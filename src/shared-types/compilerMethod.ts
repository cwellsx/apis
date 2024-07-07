import { MethodNameStrings } from "./methodNameStrings";

export type CompilerMethod = {
  assemblyName: string;
  compilerNamespace: string;
  compilerType: string;
  compilerMethod: string;
  ownerNamespace: string;
  ownerType: string;
  ownerMethod: string;
  declaringType: string; // used to assert that declaringType matches ownerType
  callStack: MethodNameStrings[] | undefined;
  error: string | undefined;
  info: string | undefined;
};
