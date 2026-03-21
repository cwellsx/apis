import type { ApiViewOptions, MethodViewOptions, ReferenceViewOptions } from "../../contracts-ui";

type DefaultViewOptions = {
  referenceViewOptions: ReferenceViewOptions;
  methodViewOptions: MethodViewOptions;
  apiViewOptions: ApiViewOptions;
};

export const defaultViewOptions: DefaultViewOptions = {
  referenceViewOptions: { nestedClusters: true, viewType: "references" },

  methodViewOptions: {
    methodId: undefined,
    viewType: "methods",
    showClustered: { clusterBy: "assembly", nestedClusters: true },
    showEdgeLabels: { groups: false, leafs: false },
  },

  apiViewOptions: {
    viewType: "apis",
    showEdgeLabels: { groups: false, leafs: false },
    showInternalCalls: false,
    showClustered: { clusterBy: "assembly", nestedClusters: true },
  },
};
