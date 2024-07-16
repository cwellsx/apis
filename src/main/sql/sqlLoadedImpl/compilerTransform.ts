import { mapOfMaps } from "../../shared-types";
import { Call, TypeAndMethodId } from "../sqlLoadedApiTypes";
import { CompilerMethodColumns } from "./columns";

type CompilerTransform = {
  filterCall: (call: Call) => boolean;
  isCompilerMethod: (typeAndMethodId: TypeAndMethodId) => boolean;
  getOwner: (typeAndMethodId: TypeAndMethodId) => TypeAndMethodId;
};

export const compilerTransformDisabled: CompilerTransform = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filterCall: (call: Call) => true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isCompilerMethod: (typeAndMethodId: TypeAndMethodId) => false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getOwner: (typeAndMethodId: TypeAndMethodId) => {
    throw new Error("shouldn't be called");
  },
};

export const compilerTransform = (compilerColumns: CompilerMethodColumns[]): CompilerTransform => {
  // map to transform compiler methods to user methods
  const assemblyMethodMap = mapOfMaps(
    compilerColumns.map((columns) => [
      columns.assemblyName,
      columns.compilerMethod,
      { methodId: columns.ownerMethod, typeId: columns.ownerType, namespace: columns.ownerNamespace },
    ])
  );

  type Owner = { methodId: number; typeId: number; namespace: string | null };
  const getOwner = (typeAndMethodId: TypeAndMethodId): Owner | undefined =>
    assemblyMethodMap.get(typeAndMethodId.assemblyName)?.get(typeAndMethodId.methodId);

  const filterCall = (call: Call): boolean => {
    if (getOwner(call.to)) return false;
    const fromOwner = getOwner(call.from);
    if (fromOwner) {
      call.from.methodId = fromOwner.methodId;
      call.from.namespace = fromOwner.namespace ?? "";
      call.from.typeId = fromOwner.typeId;
    }
    return true;
  };

  return {
    filterCall,
    isCompilerMethod: (typeAndMethodId: TypeAndMethodId) => getOwner(typeAndMethodId) !== undefined,
    getOwner: (typeAndMethodId: TypeAndMethodId) => {
      const owner = getOwner(typeAndMethodId);
      if (!owner) throw new Error("no owner"); // shouldn't happen if isCompilerMethod returned true
      if (!owner.methodId) return typeAndMethodId; // might happen if compilerMethods was unable to resolve this
      return {
        assemblyName: typeAndMethodId.assemblyName,
        namespace: owner.namespace ?? "",
        typeId: owner.typeId,
        methodId: owner.methodId,
      };
    },
  };
};
