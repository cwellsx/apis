import type { DetailedMethod } from "../shared-types";
import type { MethodInfo } from "./loaded";
import { validateMethodInfo } from "./loaded";

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
  badMethodCalls: validateMethodInfo(methodInfo).badMethodInfo?.badMethodCalls,
  detailType: "methodDetails",
});
