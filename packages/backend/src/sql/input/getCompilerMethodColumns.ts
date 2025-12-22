import { CompilerMethods } from "../../contracts-dotnet";
import { Columns } from "../types";
import { GetTypeId } from "./getMethodTypeId";

export const getCompilerMethodColumns = (
  compilerMethods: CompilerMethods,
  getTypeId: GetTypeId
): Columns.CompilerMethodColumns[] => {
  const result: Columns.CompilerMethodColumns[] = [];
  Object.entries(compilerMethods).forEach(([assemblyName, compilerMethodDictionary]) => {
    Object.entries(compilerMethodDictionary).forEach(([compilerMethod_, ownerMethod]) => {
      const compilerMethod = +compilerMethod_;
      const compilerTypeId = getTypeId(assemblyName, compilerMethod);
      const ownerTypeId = getTypeId(assemblyName, ownerMethod);
      result.push({
        assemblyName,
        compilerType: compilerTypeId.typeId,
        compilerMethod,
        ownerType: ownerTypeId.typeId,
        ownerNamespace: ownerTypeId.namespace,
        ownerMethod,
        info: null,
        error: null,
      });
    });
  });
  return result;
};
