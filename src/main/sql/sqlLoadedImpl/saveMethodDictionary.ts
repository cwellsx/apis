import { BadCallDetails, MethodDictionary, isBadCallDetails, isGoodCallDetails } from "../../loaded";
import { distinctor } from "../../shared-types";
import { MethodColumns } from "./columns";

//type MethodCalls = { methodId: number; calls: { assemblyName: string; methodId: number }[] };
type MethodCalls = [number, { assemblyName: string; methodId: number }[]];

const distinctCalls = distinctor<{ assemblyName: string; methodId: number }>(
  (lhs, rhs) => lhs.assemblyName == rhs.assemblyName && lhs.methodId == rhs.methodId
);

export const saveMethodDictionary = (
  assemblyName: string,
  methodDictionary: MethodDictionary
): { methodCalls: MethodCalls[]; methods: MethodColumns[]; badCallDetails: BadCallDetails[] } => {
  const methodCalls: MethodCalls[] = [];

  const badCallDetails: BadCallDetails[] = [];

  //const {} = saveMethodDictionary(assemblyName, methodDictionary);

  // const methodCalls: { [methodId: number]: { assemblyName: string; methodId: number }[] } = {};
  // assemblyCalls[assemblyName] = methodCalls;

  const methods: MethodColumns[] = Object.entries(methodDictionary).map(([key, methodDetails]) => {
    const metadataToken = +key;

    // remember any which are bad
    badCallDetails.push(...methodDetails.calls.filter(isBadCallDetails));

    // remember all to be copied into CallsColumns
    methodCalls.push([
      metadataToken,
      methodDetails.calls
        .filter(isGoodCallDetails)
        .map((callDetails) => ({
          assemblyName: callDetails.assemblyName,
          methodId: callDetails.metadataToken,
        }))
        .filter(distinctCalls),
    ]);

    // return MethodColumns
    return { assemblyName, metadataToken, methodDetails: JSON.stringify(methodDetails) };
  });

  return { methodCalls, methods, badCallDetails };
};
