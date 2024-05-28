import type { MethodNodeId, NodeId } from "./nodeId";

type ViewOptions = {
  leafVisible: NodeId[];
  groupExpanded: NodeId[];
};

export type ReferenceViewOptions = ViewOptions & {
  showGrouped: boolean;
  viewType: "references";
};

export type MethodViewOptions = ViewOptions & {
  topType: "assembly" | "namespace" | "none";
  methodId: MethodNodeId;
  viewType: "methods";
};

type ShowEdgeLabels = {
  groups: boolean;
  leafs: boolean;
};

export type ApiViewOptions = ViewOptions & {
  showEdgeLabels: ShowEdgeLabels;
  showIntraAssemblyCalls: boolean;
  viewType: "apis";
};

export type CustomViewOptions = ViewOptions & {
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

export const graphViewTypes = ["references", "methods", "apis"];

type AllGraphViewOptions = Omit<ReferenceViewOptions, "viewType"> &
  Omit<MethodViewOptions, "viewType"> &
  Omit<ApiViewOptions, "viewType"> &
  Omit<CustomViewOptions, "viewType">;

export const getShowEdgeLabels = (viewOptions: Partial<AllGraphViewOptions>): ShowEdgeLabels | undefined =>
  viewOptions["showEdgeLabels"];

export type GetSetBoolean = [boolean, (b: boolean) => void];

export const getShowGrouped = (viewOptions: Partial<AllGraphViewOptions>): GetSetBoolean | undefined => {
  const result = viewOptions["showGrouped"];
  if (result === undefined) return undefined;
  return [result, (b: boolean) => (viewOptions["showGrouped"] = b)];
};

export const getShowIntraAssemblyCalls = (viewOptions: Partial<AllGraphViewOptions>): GetSetBoolean | undefined => {
  const result = viewOptions["showIntraAssemblyCalls"];
  if (result === undefined) return undefined;
  return [result, (b: boolean) => (viewOptions["showIntraAssemblyCalls"] = b)];
};

export const viewFeatures: Record<GraphViewType, { leafType: NodeId["type"] }> = {
  references: { leafType: "assembly" },
  apis: { leafType: "type" },
  custom: { leafType: "customLeaf" },
  methods: { leafType: "method" },
};
