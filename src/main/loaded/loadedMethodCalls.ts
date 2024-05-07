export type MethodIdNamed = {
  methodMember: string;
  declaringType: string;
  assemblyName: string;
  metadataToken: number;
};

export type Error = {
  message: string;
  objects: object[];
  strings: string[];
};

export type CallDetails = {
  called: MethodIdNamed;
  error?: Error;
  isWarning?: boolean;
};

export type MethodDetails = {
  asText: string;
  methodMember: string;
  declaringType: string;
  calls: CallDetails[];
  calledBy: MethodIdNamed[];
};

export interface MethodDictionary {
  // this string is a stringized integer
  [metadataToken: string]: MethodDetails;
}
