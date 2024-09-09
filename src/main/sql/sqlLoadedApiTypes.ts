import { GraphViewType } from "../../shared-types";
import { MethodNodeId, TypeNodeId } from "../nodeIds";

export type TypeAndMethodId = {
  // TODO use Branded types instead of primitive string and number
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
  // TODO use primitive types instead of AnyNodeId types
  getTypeName: (typeNodeId: TypeNodeId) => string;
  getMethodName: (methodNodeId: MethodNodeId) => string;
  getTypeNamespace: (typeNodeId: TypeNodeId) => string | null;
};

export type Direction = "upwards" | "downwards";

export type CommonGraphViewType = Exclude<GraphViewType, "custom">;

export type CallstackIterator = {
  first: TypeAndMethodId;
  readNext: (assemblyName: string, methodId: number, direction: Direction) => TypeAndMethodId[];
};
