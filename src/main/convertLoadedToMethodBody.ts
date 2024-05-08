import type { MethodBody, MethodError } from "../shared-types";
import { getMethodName } from "./convertLoadedToMembers";
import { getTypeInfoName } from "./convertLoadedToTypes";
import { CallDetails } from "./loaded";
import type { TypeAndMethod } from "./shared-types";

const getErrors = (calls: CallDetails[]): MethodError[] | undefined => {
  const result: MethodError[] = calls.reduce<MethodError[]>((found, callDetails) => {
    const error = callDetails.error;
    if (error)
      found.push({
        heading: callDetails.isWarning ? "Warning" : "Error",
        message: error.message,
        objects: error.objects,
      });
    return found;
  }, []);
  return result.length !== 0 ? result : undefined;
};

export const convertLoadedToMethodBody = (typeAndMethod: TypeAndMethod): MethodBody => ({
  title: {
    assemblyName: typeAndMethod.type.typeId.assemblyName,
    typeName: getTypeInfoName(typeAndMethod.type),
    methodName: getMethodName(typeAndMethod.method),
  },
  asText: typeAndMethod.methodDetails.asText,
  errors: getErrors(typeAndMethod.methodDetails.calls),
  detailType: "methodBody",
});
