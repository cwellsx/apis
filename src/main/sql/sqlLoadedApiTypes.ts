import { GraphViewType, MethodNodeId, TypeNodeId } from "../../shared-types";

export type TypeAndMethodId = {
  assemblyName: string;
  namespace: string;
  typeId: number;
  methodId: number;
};

export type Call = {
  from: TypeAndMethodId;
  to: TypeAndMethodId;
};

export type GetTypeOrMethodName = {
  getTypeName: (typeNodeId: TypeNodeId) => string;
  getMethodName: (methodNodeId: MethodNodeId) => string;
  getTypeNamespace: (typeNodeId: TypeNodeId) => string | null;
};

export type Direction = "upwards" | "downwards";

export type CommonGraphViewType = Exclude<GraphViewType, "custom">;

export type CallStack = {
  first: TypeAndMethodId;
  readNext: (assemblyName: string, methodId: number, direction: Direction) => TypeAndMethodId[];
};
