import { MethodNodeId, TypeNodeId } from "../../shared-types";

type NameColumns = { assemblyName: string; metadataToken: number; name: string };
type Lookup = { [assemblyName: string]: { [metadataToken: number]: string } };

const convert = (nameRows: NameColumns[]): Lookup => {
  const result: Lookup = {};
  nameRows.forEach((nameColumns) => {
    let found: { [metadataToken: number]: string } = result[nameColumns.assemblyName];
    if (!found) {
      found = {};
      result[nameColumns.assemblyName] = found;
    }
    found[nameColumns.metadataToken] = nameColumns.name;
  });
  return result;
};

export type GetTypeOrMethodName = {
  getTypeName: (typeNodeId: TypeNodeId) => string;
  getMethodName: (methodNodeId: MethodNodeId) => string;
};

export const getTypeAndMethodNames = (typeNames: NameColumns[], methodNames: NameColumns[]): GetTypeOrMethodName => {
  const assemblyTypeNames = convert(typeNames);
  const assemblyMethodNames = convert(methodNames);

  const getTypeName = (typeNodeId: TypeNodeId): string =>
    assemblyTypeNames[typeNodeId.assemblyName][typeNodeId.metadataToken];

  const getMethodName = (methodNodeId: MethodNodeId): string =>
    assemblyMethodNames[methodNodeId.assemblyName][methodNodeId.metadataToken];

  return { getTypeName, getMethodName };
};
