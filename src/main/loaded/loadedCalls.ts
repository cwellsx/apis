export type Error = {
  errorMessage: string;
  wantType: object;
  wantMethod: object;
  genericTypeArguments?: object[];
  genericMethodArguments?: object[];
  foundMethods?: object[];
  transformedMethods?: object[];
};

type GoodMethodCall = {
  assemblyName: string;
  metadataToken: number;
};

type WarnMethodCall = {
  assemblyName: string;
  metadataToken: number;
  error: Error;
};

type FailMethodCall = {
  assemblyName: string;
  error: Error;
};

type MethodCall = GoodMethodCall | WarnMethodCall | FailMethodCall;
export type BadMethodCall = WarnMethodCall | FailMethodCall;
export type ValidMethodCall = GoodMethodCall | WarnMethodCall;

const isBadMethodCall = (methodCall: MethodCall): methodCall is BadMethodCall =>
  (methodCall as BadMethodCall).error !== undefined;

const isValidMethodCall = (methodCall: MethodCall): methodCall is ValidMethodCall =>
  (methodCall as ValidMethodCall).metadataToken !== undefined;

const combine = <T>(called: T[] | undefined, argued: T[] | undefined): T[] | undefined =>
  !called ? argued : !argued ? called : [...called, ...argued];

export const getBadMethodCalls = (methodInfo: MethodInfo): BadMethodCall[] | undefined => {
  const methodCalls: MethodCall[] | undefined = combine(methodInfo.called, methodInfo.argued);
  const result = methodCalls?.filter(isBadMethodCall);
  return !result || result.length == 0 ? undefined : result;
};

export const getValidMethodCalls = (methodInfo: MethodInfo): ValidMethodCall[] | undefined => {
  const methodCalls: MethodCall[] | undefined = combine(methodInfo.called, methodInfo.argued);
  const result = methodCalls?.filter(isValidMethodCall);
  return !result || result.length == 0 ? undefined : result;
};

export type MethodInfo = {
  asText: string;
  called?: MethodCall[];
  argued?: MethodCall[];
  exception?: string;
};

// this doesn't exist separately in the Reflected AssemblyMethods
// it's a subset of some of the MethodCalls
export type BadMethodInfo = {
  asText: string;
  badMethodCalls?: BadMethodCall[];
  exception?: string;
};

export type MethodDictionary = {
  // metadataToken is a stringized integer
  [metadataToken: string]: MethodInfo;
};
