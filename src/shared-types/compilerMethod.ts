export type CompilerMethod = {
  assemblyName: string;
  compilerType: string;
  compilerMethod: string;
  ownerType: string;
  ownerMethod: string;
  declaringType: string; // used to assert that declaringType matches ownerType
  error?: string;
};
