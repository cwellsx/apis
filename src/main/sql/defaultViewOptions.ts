import type { ApiViewOptions, CustomViewOptions, MethodViewOptions, ReferenceViewOptions } from "../../shared-types";
import { methodNodeId } from "../../shared-types";

export const defaultCustomViewOptions: CustomViewOptions = {
  nodeProperties: [],
  clusterBy: [],
  tags: [],
  viewType: "custom",
  showEdgeLabels: {
    groups: false,
    leafs: false,
  },
};

export const defaultReferenceViewOptions: ReferenceViewOptions = {
  nestedClusters: true,
  viewType: "references",
};

export const defaultMethodViewOptions: MethodViewOptions = {
  methodId: methodNodeId("?", 0),
  viewType: "methods",
  showClustered: {
    clusterBy: "assembly",
    nestedClusters: true,
  },
  showEdgeLabels: {
    groups: false,
    leafs: false,
  },
};

export const defaultApiViewOptions: ApiViewOptions = {
  viewType: "apis",
  showEdgeLabels: {
    groups: false,
    leafs: false,
  },
  showInternalCalls: false,
  showClustered: {
    clusterBy: "assembly",
    nestedClusters: true,
  },
};
