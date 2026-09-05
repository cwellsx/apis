import { NodeId, nodeIdEquals } from "./nodeId";

export type GraphFilter = { leafVisible: NodeId[]; groupExpanded: NodeId[]; isCheckModelAll: boolean };

export const isGroupExpanded = (nodeId: NodeId, graphFilter: GraphFilter): boolean =>
  !!graphFilter.groupExpanded.find((it) => nodeIdEquals(it, nodeId));

export const isLeafVisible = (nodeId: NodeId, graphFilter: GraphFilter): boolean =>
  !!graphFilter.leafVisible.find((it) => nodeIdEquals(it, nodeId));
