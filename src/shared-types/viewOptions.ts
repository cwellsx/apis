import type { MethodNodeId, NodeId } from "./nodeId";

type TreeViewOptions = {
  leafVisible: NodeId[];
  groupExpanded: NodeId[];
};

export type ReferenceViewOptions = TreeViewOptions & {
  showGrouped: boolean;
  viewType: "references";
};

export type MethodViewOptions = TreeViewOptions & {
  topType: "assembly" | "namespace" | "none";
  methodId: MethodNodeId;
  viewType: "methods";
};

type ShowEdgeLabels = {
  groups: boolean;
  leafs: boolean;
};

export type ApiViewOptions = TreeViewOptions & {
  showEdgeLabels: ShowEdgeLabels;
  showIntraAssemblyCalls: boolean;
  viewType: "apis";
};

export type CustomViewOptions = TreeViewOptions & {
  nodeProperties: string[];
  groupedBy: string[];
  tags: { tag: string; shown: boolean }[];
  showEdgeLabels: ShowEdgeLabels;
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

// type predicates

type AnyGraphViewOptions = Partial<
  Omit<ReferenceViewOptions, "viewType"> &
    Omit<MethodViewOptions, "viewType"> &
    Omit<ApiViewOptions, "viewType"> &
    Omit<CustomViewOptions, "viewType">
>;

export const getShowEdgeLabels = (viewOptions: AnyGraphViewOptions): ShowEdgeLabels | undefined =>
  viewOptions["showEdgeLabels"];

export type GetSetBoolean = [boolean, (b: boolean) => void];

export const getShowGrouped = (viewOptions: AnyGraphViewOptions): GetSetBoolean | undefined => {
  const result = viewOptions["showGrouped"];
  if (result === undefined) return undefined;
  return [result, (b: boolean) => (viewOptions["showGrouped"] = b)];
};

export const getShowIntraAssemblyCalls = (viewOptions: AnyGraphViewOptions): GetSetBoolean | undefined => {
  const result = viewOptions["showIntraAssemblyCalls"];
  if (result === undefined) return undefined;
  return [result, (b: boolean) => (viewOptions["showIntraAssemblyCalls"] = b)];
};
