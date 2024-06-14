import type { DetailedMethod } from "../shared-types";
import type { BadCallDetails, CallDetails, MethodDetails } from "./loaded";
import { isBadCallDetails } from "./loaded";

const getBadCallDetails = (calls: CallDetails[]): BadCallDetails[] | undefined => {
  const result = calls.filter(isBadCallDetails);
  return result.length !== 0 ? result : undefined;
};

export const convertLoadedToDetailedMethod = (
  assemblyName: string,
  typeName: string,
  methodName: string,
  methodDetails: MethodDetails
): DetailedMethod => ({
  title: {
    assemblyName,
    declaringType: typeName,
    methodMember: methodName,
  },
  asText: methodDetails.asText,
  errors: getBadCallDetails(methodDetails.calls),
  detailType: "methodDetails",
});
