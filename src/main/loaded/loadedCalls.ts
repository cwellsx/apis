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

type GoodLocalsType = {
  assemblyName: string;
  metadataToken: number;
};
type FailLocalsType = {
  assemblyName: string;
  error: string;
};
type LocalsType = GoodLocalsType | FailLocalsType;

const isBadMethodCall = (methodCall: MethodCall): methodCall is BadMethodCall =>
  (methodCall as BadMethodCall).error !== undefined;

const isValidMethodCall = (methodCall: MethodCall): methodCall is ValidMethodCall =>
  (methodCall as ValidMethodCall).metadataToken !== undefined;

const combine = <T>(called: T[] | undefined, argued: T[] | undefined): T[] | undefined =>
  !called ? argued : !argued ? called : [...called, ...argued];

const isFailLocalsType = (localsType: LocalsType): localsType is FailLocalsType =>
  (localsType as FailLocalsType).error !== undefined;

const isGoodLocalsType = (localsType: LocalsType): localsType is GoodLocalsType =>
  (localsType as GoodLocalsType).metadataToken !== undefined;

const getBadMethodCalls = (methodInfo: MethodInfo): BadMethodCall[] | undefined => {
  const methodCalls: MethodCall[] | undefined = combine(methodInfo.called, methodInfo.argued);
  const result = methodCalls?.filter(isBadMethodCall);
  return !result || result.length == 0 ? undefined : result;
};

const getValidMethodCalls = (methodInfo: MethodInfo): ValidMethodCall[] | undefined => {
  const methodCalls: MethodCall[] | undefined = combine(methodInfo.called, methodInfo.argued);
  const result = methodCalls?.filter(isValidMethodCall);
  return !result || result.length == 0 ? undefined : result;
};

const getFailLocalsTypes = (methodInfo: MethodInfo): FailLocalsType[] | undefined => {
  const result = methodInfo.locals?.filter(isFailLocalsType);
  return !result || result.length == 0 ? undefined : result;
};

export type MethodInfo = {
  asText: string;
  called?: MethodCall[];
  argued?: MethodCall[];
  locals?: LocalsType[];
  exception?: string;
};

// this doesn't exist separately in the Reflected AssemblyMethods
// it's a subset of some of the MethodCalls
export type BadMethodInfo = {
  asText: string;
  badMethodCalls?: BadMethodCall[];
  badLocalsTypes?: FailLocalsType[];
  exception?: string;
};

const getBadMethodInfo = (methodInfo: MethodInfo): BadMethodInfo | undefined => {
  const badMethodCalls = getBadMethodCalls(methodInfo);
  const badLocalsTypes = getFailLocalsTypes(methodInfo);
  return badMethodCalls || badLocalsTypes || methodInfo.exception
    ? {
        asText: methodInfo.asText,
        badMethodCalls,
        badLocalsTypes,
        exception: methodInfo.exception,
      }
    : undefined;
};

export const validateMethodInfo = (
  methodInfo: MethodInfo
): { methodCalls: ValidMethodCall[]; localsTypes: GoodLocalsType[]; badMethodInfo: BadMethodInfo | undefined } => ({
  methodCalls: getValidMethodCalls(methodInfo) ?? [],
  localsTypes: methodInfo.locals?.filter(isGoodLocalsType) ?? [],
  badMethodInfo: getBadMethodInfo(methodInfo),
});

export type MethodDictionary = {
  // metadataToken is a stringized integer
  [metadataToken: string]: MethodInfo;
};
