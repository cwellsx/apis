import type { MethodDictionary, MethodInfo, ValidMethodCall } from "../../loaded";
import { getBadMethodCalls, getValidMethodCalls } from "../../loaded";
import { distinctor } from "../../shared-types";
import { BadMethodInfoAndIds, CallColumns, LoadedCall, MethodColumns } from "./columns";
import { GetTypeId } from "./getMethodTypeId";

const distinctCalls = distinctor<{ toAssemblyName: string; toMethodId: number }>(
  (lhs, rhs) => lhs.toAssemblyName == rhs.toAssemblyName && lhs.toMethodId == rhs.toMethodId
);

type GetCallColumns = (loaded: LoadedCall) => CallColumns;

export const flattenMethodDictionary = (
  assemblyName: string,
  methodDictionary: MethodDictionary,
  getTypeId: GetTypeId
): { callColumns: CallColumns[]; methodColumns: MethodColumns[]; badMethodInfos: BadMethodInfoAndIds[] } => {
  const callColumns: CallColumns[] = [];
  const methodColumns: MethodColumns[] = [];
  const badMethodInfos: BadMethodInfoAndIds[] = [];

  const getCallColumns: GetCallColumns = (loaded: LoadedCall) => {
    const { namespace: fromNamespace, typeId: fromTypeId } = getTypeId(loaded.fromAssemblyName, loaded.fromMethodId);
    const { namespace: toNamespace, typeId: toTypeId } = getTypeId(loaded.toAssemblyName, loaded.toMethodId);
    return { ...loaded, fromNamespace, fromTypeId, toNamespace, toTypeId };
  };

  const addBadMethodInfo = (methodId: number, methodInfo: MethodInfo): void => {
    const badMethodCalls = getBadMethodCalls(methodInfo);
    if (badMethodCalls || methodInfo.exception) {
      const { typeId } = getTypeId(assemblyName, methodId);
      badMethodInfos.push({
        methodId,
        typeId,
        asText: methodInfo.asText,
        badMethodCalls,
        exception: methodInfo.exception,
      });
    }
  };

  const addCallColumns = (fromMethodId: number, calls: ValidMethodCall[] | undefined): void => {
    if (!calls) return;
    callColumns.push(
      ...calls
        .map((methodCall) => ({
          toAssemblyName: methodCall.assemblyName,
          toMethodId: methodCall.metadataToken,
        }))
        .filter(distinctCalls)
        .map((call) => getCallColumns({ ...call, fromAssemblyName: assemblyName, fromMethodId }))
    );
  };

  Object.entries(methodDictionary).forEach(([key, methodInfo]) => {
    const metadataToken = +key;

    // BadMethodInfoAndIds[]
    addBadMethodInfo(metadataToken, methodInfo);

    // CallColumns[]
    addCallColumns(metadataToken, getValidMethodCalls(methodInfo));

    // MethodColumns[]
    methodColumns.push({ assemblyName, metadataToken, methodInfo });
  });

  return { callColumns, methodColumns, badMethodInfos };
};
