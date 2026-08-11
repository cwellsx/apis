import type { ClusterBy, NodeId } from "./nodeId";

export type ShowClustered = { clusterBy: ClusterBy; nestedClusters: boolean };

export type ShowEdgeLabels = { groups: boolean; leafs: boolean };

export type References = {
  graphType: "references";
  nestedClusters: boolean; // one element from ShowClustered
};

export type Methods = {
  graphType: "methods";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  methodId?: NodeId; // should be MethodNodeId but don't want all the nodeIds types shared with the renderer
};

export type Apis = {
  graphType: "apis";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  showInternalCalls: boolean;
};

type CustomBase = {
  graphType: "custom";
  showEdgeLabels: ShowEdgeLabels;
  // these are extra/random strings in the CustomNode.tags array which can be used to filter which nodes are shown
  tags: { tag: string; shown: boolean }[];
};

type CustomAuto = CustomBase & {
  readonly isAutoLayers: true;
  // these are the names of layers defined in all CustomNode.layer property
  readonly layers: string[];
};

// this is used when the JSON is created by hand and contains semi-random properties
export type CustomManual = CustomBase & {
  readonly isAutoLayers: false;
  // these are extra/random properties added to CustomNode, any one of which can be used to specify layers
  nodeProperties: string[];
  // this optionally contains one element which the yser select from nodeProperties
  // it's an array so that if the UI were more complicated then the user could specify more than one level of layering
  clusterBy: string[];
};

export const isCustomManual = (viewOptions: Custom): viewOptions is CustomManual => !viewOptions.isAutoLayers;

export type Custom = CustomAuto | CustomManual;

export type Any = References | Methods | Apis | Custom;

//export type AnyOptions = Partial<{ showEdgeLabels?: ShowEdgeLabels }>;
//type Flatten<U> = { [K in keyof U]: U[K] };

export const getShowEdgeLabels = (viewOptions: Any): ShowEdgeLabels =>
  (viewOptions as { showEdgeLabels?: ShowEdgeLabels })["showEdgeLabels"] ?? { groups: false, leafs: false };

//export type AnyOptions = Partial<Flatten<Any>>;

export const isCustom = (viewOptions: Any): viewOptions is Custom => viewOptions.graphType === "custom";
