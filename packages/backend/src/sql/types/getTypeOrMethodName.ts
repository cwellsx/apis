import { MethodNodeId, TypeNodeId } from "../../nodeIds";

export type GetTypeOrMethodName = {
  // TODO use primitive types instead of AnyNodeId types
  getTypeName: (typeNodeId: TypeNodeId) => string;
  getMethodName: (methodNodeId: MethodNodeId) => string;
  getTypeNamespace: (typeNodeId: TypeNodeId) => string | null;
};
