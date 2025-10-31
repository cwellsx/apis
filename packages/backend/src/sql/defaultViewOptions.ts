import type { ApiViewOptions, CompilerViewOptions, MethodViewOptions, ReferenceViewOptions } from "../shared-types";

type DefaultViewOptions = {
  referenceViewOptions: ReferenceViewOptions;
  methodViewOptions: MethodViewOptions;
  apiViewOptions: ApiViewOptions;
  compilerViewOptions: CompilerViewOptions;
};

export const defaultViewOptions: DefaultViewOptions = {
  referenceViewOptions: {
    nestedClusters: true,
    viewType: "references",
  },

  methodViewOptions: {
    methodId: undefined,
    viewType: "methods",
    showClustered: {
      clusterBy: "assembly",
      nestedClusters: true,
    },
    showEdgeLabels: {
      groups: false,
      leafs: false,
    },
  },

  apiViewOptions: {
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
  },

  compilerViewOptions: {
    viewType: "compiler",
    errorsOnly: true,
  },
};
