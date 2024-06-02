import type { MethodNodeId, NodeId } from "./nodeId";

type ShowClustered = {
  clusterBy: "assembly" | "namespace";
  nestedClusters: boolean;
};

type ShowEdgeLabels = {
  groups: boolean;
  leafs: boolean;
};

type TreeViewOptions = {
  leafVisible: NodeId[];
  groupExpanded: NodeId[];
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
};

export type ReferenceViewOptions = Omit<TreeViewOptions, "showEdgeLabels" | "showClustered"> & {
  viewType: "references";
  nestedClusters: boolean; // one element from ShowClustered
};

export type MethodViewOptions = TreeViewOptions & {
  topType: "assembly" | "namespace" | "none";
  methodId: MethodNodeId;
  viewType: "methods";
};

export type ApiViewOptions = TreeViewOptions & {
  showIntraAssemblyCalls: boolean;
  viewType: "apis";
};

export type CustomViewOptions = Omit<TreeViewOptions, "showClustered"> & {
  nodeProperties: string[];
  clusterBy: string[]; // one element from ShowClustered
  tags: { tag: string; shown: boolean }[];
  viewType: "custom";
};

export type ErrorsViewOptions = {
  viewType: "errors";
};

export type GreetingViewOptions = {
  viewType: "greeting";
};

export type GraphViewOptions = ReferenceViewOptions | MethodViewOptions | ApiViewOptions | CustomViewOptions;
export type GraphViewType = "references" | "methods" | "apis" | "custom";

export const viewFeatures: Record<GraphViewType, { leafType: NodeId["type"]; details: ("leaf" | "edge")[] }> = {
  references: { leafType: "assembly", details: ["leaf"] },
  apis: { leafType: "type", details: ["edge"] },
  custom: { leafType: "customLeaf", details: [] },
  methods: { leafType: "method", details: ["leaf"] },
};

export type ViewOptions =
  | ReferenceViewOptions
  | MethodViewOptions
  | ErrorsViewOptions
  | GreetingViewOptions
  | CustomViewOptions
  | ApiViewOptions;

export type ViewType = "references" | "methods" | "errors" | "greeting" | "apis" | "custom";

export type AnyGraphViewOptions = Partial<
  Omit<ReferenceViewOptions, "viewType"> &
    Omit<MethodViewOptions, "viewType"> &
    Omit<ApiViewOptions, "viewType"> &
    Omit<CustomViewOptions, "viewType">
>;
