import type { MethodDictionary } from "../../loaded";
import { validateMethodInfo } from "../../loaded";
import { log } from "../../log";
import { distinctor } from "../../shared-types";
import { BadMethodInfoAndIds, CallColumns, LocalsTypeColumns, MethodColumns } from "./columns";
import { GetTypeId } from "./getMethodTypeId";

const distinctCalls = distinctor<{ toAssemblyName: string; toMethodId: number }>(
  (lhs, rhs) => lhs.toAssemblyName == rhs.toAssemblyName && lhs.toMethodId == rhs.toMethodId
);

export const flattenMethodDictionary = (
  assemblyName: string,
  methodDictionary: MethodDictionary,
  getTypeId: GetTypeId
): {
  callColumns: CallColumns[];
  methodColumns: MethodColumns[];
  badMethodInfos: BadMethodInfoAndIds[];
  localsTypeColumns: LocalsTypeColumns[];
} => {
  log("flattenMethodDictionary");

  const callColumns: CallColumns[] = [];
  const methodColumns: MethodColumns[] = [];
  const badMethodInfos: BadMethodInfoAndIds[] = [];
  const localsTypeColumns: LocalsTypeColumns[] = [];

  Object.entries(methodDictionary).forEach(([key, methodInfo]) => {
    const metadataToken = +key;

    // returned methodCalls includes methodInfo.called and methodInfo.argued
    const { methodCalls, localsTypes, badMethodInfo } = validateMethodInfo(methodInfo);

    // BadMethodInfoAndIds[]
    if (badMethodInfo)
      badMethodInfos.push({
        methodId: metadataToken,
        typeId: getTypeId(assemblyName, metadataToken).typeId,
        ...badMethodInfo,
      });

    // CallColumns[]
    callColumns.push(
      ...methodCalls
        .map((methodCall) => ({
          toAssemblyName: methodCall.assemblyName,
          toMethodId: methodCall.metadataToken,
        }))
        .filter(distinctCalls)
        .map((call) => {
          const fromAssemblyName = assemblyName;
          const fromMethodId = metadataToken;
          const { namespace: fromNamespace, typeId: fromTypeId } = getTypeId(fromAssemblyName, fromMethodId);
          const { namespace: toNamespace, typeId: toTypeId } = getTypeId(call.toAssemblyName, call.toMethodId);
          return { ...call, fromNamespace, fromTypeId, toNamespace, toTypeId, fromAssemblyName, fromMethodId };
        })
    );

    // LocalsTypeColumns[]
    localsTypeColumns.push(
      ...localsTypes.map((localsType) => {
        const { typeId: ownerType, namespace: ownerNamespace } = getTypeId(assemblyName, metadataToken);
        return {
          assemblyName: localsType.assemblyName,
          ownerType,
          ownerNamespace,
          ownerMethod: metadataToken,
          compilerType: localsType.metadataToken,
        };
      })
    );

    // MethodColumns[]
    methodColumns.push({ assemblyName, metadataToken, methodInfo });
  });

  return { callColumns, methodColumns, badMethodInfos, localsTypeColumns };
};
