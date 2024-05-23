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

export type ApiViewOptions = ViewOptions & {
  showGrouped: boolean;

  viewType: "apis";
};

export type GroupedLabels = {
  serverLabel: boolean;
  edgeLabel: boolean;
};

export type CustomViewOptions = ViewOptions & {
  nodeProperties: string[];
  groupedBy: string[];
  tags: { tag: string; shown: boolean }[];
  edgeLabels: {
    label: boolean;
    attributes: boolean;
  };
  groupedLabels: GroupedLabels;
  viewType: "custom";
};

export const joinLabel = (
  b1: boolean,
  s1: string | undefined,
  b2: boolean,
  s2: string | undefined
): string | undefined => {
  if (!b1) s1 = undefined;
  if (!b2) s2 = undefined;
  if (!s1 && !s2) return undefined;
  if (s1 && s2) return `${s1} ${s2}`;
  return s1 ? s1 : s2;
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
