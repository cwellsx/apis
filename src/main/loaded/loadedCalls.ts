export type Error = {
  errorMessage: string;
  wantType: object;
  wantMethod: object;
  genericTypeArguments?: object[];
  genericMethodArguments?: object[];
  foundMethods?: object[];
  transformedMethods?: object[];
};

export type MethodNameStrings = {
  methodMember: string;
  declaringType: string;
  assemblyName: string;
};

export type GoodCallDetails = MethodNameStrings & {
  metadataToken: number;
};

export type BadCallDetails = MethodNameStrings & {
  metadataToken?: number;
  error: Error;
};

export type CallDetails = GoodCallDetails | BadCallDetails;

export type MethodDetails = {
  asText: string;
  methodMember: string;
  declaringType: string;
  calls: CallDetails[];
  calledBy: GoodCallDetails[];
};

export type MethodDictionary = {
  // metadataToken is a stringized integer
  [metadataToken: string]: MethodDetails;
};

export const isBadCallDetails = (callDetails: CallDetails): callDetails is BadCallDetails =>
  (callDetails as BadCallDetails).error !== undefined;
export const isGoodCallDetails = (callDetails: CallDetails): callDetails is GoodCallDetails =>
  callDetails.metadataToken !== undefined;
