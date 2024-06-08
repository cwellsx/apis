import type { DetailedMethod } from "../shared-types";
import type { BadCallDetails, CallDetails } from "./loaded";
import { isBadCallDetails } from "./loaded";
import type { TypeAndMethodDetails } from "./shared-types";
import { getMethodName, getTypeInfoName } from "./shared-types";

const getBadCallDetails = (calls: CallDetails[]): BadCallDetails[] | undefined => {
  const result = calls.filter(isBadCallDetails);
  return result.length !== 0 ? result : undefined;
};

export const convertLoadedToDetailedMethod = (typeAndMethod: TypeAndMethodDetails): DetailedMethod => ({
  title: {
    assemblyName: typeAndMethod.type.typeId.assemblyName,
    declaringType: getTypeInfoName(typeAndMethod.type),
    methodMember: getMethodName(typeAndMethod.method),
  },
  asText: typeAndMethod.methodDetails.asText,
  errors: getBadCallDetails(typeAndMethod.methodDetails.calls),
  detailType: "methodDetails",
});
