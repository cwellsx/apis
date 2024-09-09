import type { ClusterBy, NodeId } from "./nodeId";

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
  methodId?: NodeId; // should be MethodNodeId but don't want all the nodeIds types shared with the renderer
};

export type ApiViewOptions = {
  viewType: "apis";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  showInternalCalls: boolean;
};

type CustomViewOptionsBase = {
  viewType: "custom";
  showEdgeLabels: ShowEdgeLabels;
  // these are extra/random strings in the CustomNode.tags array which can be used to filter which nodes are shown
  tags: { tag: string; shown: boolean }[];
};

type CustomViewOptionsAuto = CustomViewOptionsBase & {
  readonly isAutoLayers: true;
  // these are the names of layers defined in all CustomNode.layer property
  readonly layers: string[];
};

// this is used when the JSON is created by hand and contains semi-random properties
export type CustomViewOptionsManual = CustomViewOptionsBase & {
  readonly isAutoLayers: false;
  // these are extra/random properties added to CustomNode, any one of which can be used to specify layers
  nodeProperties: string[];
  // this optionally contains one element which the yser select from nodeProperties
  // it's an array so that if the UI were more complicated then the user could specify more than one level of layering
  clusterBy: string[];
};

export const isCustomManual = (viewOptions: CustomViewOptions): viewOptions is CustomViewOptionsManual =>
  !viewOptions.isAutoLayers;

export type CustomViewOptions = CustomViewOptionsManual | CustomViewOptionsAuto;
