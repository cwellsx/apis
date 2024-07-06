import type { DetailedMethod } from "../shared-types";
import { getBadMethodCalls, MethodInfo } from "./loaded";

export const convertLoadedToDetailedMethod = (
  assemblyName: string,
  typeName: string,
  methodName: string,
  methodInfo: MethodInfo
): DetailedMethod => ({
  title: {
    assemblyName,
    declaringType: typeName,
    methodMember: methodName,
  },
  asText: methodInfo.asText,
  errors: getBadMethodCalls(methodInfo)?.map((badMethodCall) => badMethodCall.error),
  detailType: "methodDetails",
});
