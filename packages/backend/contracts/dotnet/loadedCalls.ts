export type MethodCall = { assemblyName: string; metadataToken: number };

export type LocalsType = { assemblyName: string; metadataToken: number };

export type MethodInfo = { asText: string; called?: MethodCall[]; argued?: MethodCall[]; locals?: LocalsType[] };

export type MethodDictionary = {
  // metadataToken is a stringized integer
  [metadataToken: string]: MethodInfo;
};
