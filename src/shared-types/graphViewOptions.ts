import type { ClusterBy, MethodNodeId, NodeId } from "./nodeId";

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
  nodeProperties: string[];
  clusterBy: string[]; // one element from ShowClustered
  showEdgeLabels: ShowEdgeLabels;
  tags: { tag: string; shown: boolean }[];
  viewType: "custom";
};

export type GraphViewOptions = ReferenceViewOptions | MethodViewOptions | ApiViewOptions | CustomViewOptions;
export type GraphViewType = "references" | "methods" | "apis" | "custom";

export type CommonGraphViewType = Exclude<GraphViewType, "custom">;

export const viewFeatures: Record<GraphViewType, { leafType: NodeId["type"]; details: ("leaf" | "edge")[] }> = {
  references: { leafType: "assembly", details: ["leaf"] },
  apis: { leafType: "type", details: ["edge"] },
  custom: { leafType: "customLeaf", details: [] },
  methods: { leafType: "method", details: ["leaf"] },
};

export type ViewOptions = ReferenceViewOptions | MethodViewOptions | CustomViewOptions | ApiViewOptions;

export type AnyGraphViewOptions = Partial<
  Omit<ReferenceViewOptions, "viewType"> &
    Omit<MethodViewOptions, "viewType"> &
    Omit<ApiViewOptions, "viewType"> &
    Omit<CustomViewOptions, "viewType">
>;
