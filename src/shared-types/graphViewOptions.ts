import type { ClusterBy, MethodNodeId } from "./nodeId";

type ShowClustered = {
  clusterBy: ClusterBy;
  nestedClusters: boolean;
};

type ShowEdgeLabels = {
  groups: boolean;
  leafs: boolean;
};

export type ReferenceViewOptions = {
  viewType: "references";
  nestedClusters: boolean; // one element from ShowClustered
};

export type MethodViewOptions = {
  viewType: "methods";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  methodId: MethodNodeId;
};

export type ApiViewOptions = {
  viewType: "apis";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  showInternalCalls: boolean;
};

export type CustomViewOptions = {
  viewType: "custom";
  nodeProperties: string[];
  clusterBy: string[]; // one element from ShowClustered
  showEdgeLabels: ShowEdgeLabels;
  tags: { tag: string; shown: boolean }[];
};
