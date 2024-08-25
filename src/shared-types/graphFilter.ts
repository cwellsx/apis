import { NodeId } from "./nodeId";

export type GraphFilter = {
  leafVisible: NodeId[];
  groupExpanded: NodeId[];
  isCheckModelAll: boolean;
};
