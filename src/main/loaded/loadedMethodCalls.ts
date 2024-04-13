export type Method = {
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
  called: Method;
  error?: Error;
  isWarning?: boolean;
};

export type MethodDetails = {
  asText: string;
  calls: CallDetails[];
  calledBy: Method[];
};

export interface MethodsDictionary {
  // this string is a stringized integer
  [metadataToken: string]: MethodDetails;
}
