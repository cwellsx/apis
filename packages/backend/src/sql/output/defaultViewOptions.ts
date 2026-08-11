import type { GraphOptions } from "../../contracts-ui";

type DefaultViewOptions = {
  referenceViewOptions: GraphOptions.References;
  methodViewOptions: GraphOptions.Methods;
  apiViewOptions: GraphOptions.Apis;
};

export const defaultViewOptions: DefaultViewOptions = {
  referenceViewOptions: { nestedClusters: true, graphType: "references" },

  methodViewOptions: {
    methodId: undefined,
    graphType: "methods",
    showClustered: { clusterBy: "assembly", nestedClusters: true },
    showEdgeLabels: { groups: false, leafs: false },
  },

  apiViewOptions: {
    graphType: "apis",
    showEdgeLabels: { groups: false, leafs: false },
    showInternalCalls: false,
    showClustered: { clusterBy: "assembly", nestedClusters: true },
  },
};
