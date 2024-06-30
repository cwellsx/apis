import { BadCallDetails, MethodDictionary, isBadCallDetails, isGoodCallDetails } from "../../loaded";
import { distinctor } from "../../shared-types";
import { CallColumns, MethodColumns } from "./columns";
import { GetCallColumns } from "./widenCallColumns";

const distinctCalls = distinctor<{ toAssemblyName: string; toMethodId: number }>(
  (lhs, rhs) => lhs.toAssemblyName == rhs.toAssemblyName && lhs.toMethodId == rhs.toMethodId
);

export const flattenMethodDictionary = (
  assemblyName: string,
  methodDictionary: MethodDictionary,
  getCallColumns: GetCallColumns
): { callColumns: CallColumns[]; methods: MethodColumns[]; badCallDetails: BadCallDetails[] } => {
  const callColumns: CallColumns[] = [];
  const badCallDetails: BadCallDetails[] = [];

  const methods: MethodColumns[] = Object.entries(methodDictionary).map(([key, methodDetails]) => {
    const metadataToken = +key;

    // BadCallDetails[]
    badCallDetails.push(...methodDetails.calls.filter(isBadCallDetails));

    // CallColumns[]
    callColumns.push(
      ...methodDetails.calls
        .filter(isGoodCallDetails)
        .map((callDetails) => ({
          toAssemblyName: callDetails.assemblyName,
          toMethodId: callDetails.metadataToken,
        }))
        .filter(distinctCalls)
        .map((call) => getCallColumns({ ...call, fromAssemblyName: assemblyName, fromMethodId: metadataToken }))
    );

    // return MethodColumns
    return { assemblyName, metadataToken, methodDetails };
  });

  return { callColumns, methods, badCallDetails };
};
