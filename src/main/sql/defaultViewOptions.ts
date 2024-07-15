import type {
  ApiViewOptions,
  CompilerViewOptions,
  CustomViewOptions,
  MethodViewOptions,
  ReferenceViewOptions,
} from "../../shared-types";
import { methodNodeId } from "../../shared-types";

type DefaultViewOptions = {
  customViewOptions: CustomViewOptions;
  referenceViewOptions: ReferenceViewOptions;
  methodViewOptions: MethodViewOptions;
  apiViewOptions: ApiViewOptions;
  compilerViewOptions: CompilerViewOptions;
};

export const defaultViewOptions: DefaultViewOptions = {
  customViewOptions: {
    nodeProperties: [],
    clusterBy: [],
    tags: [],
    viewType: "custom",
    showEdgeLabels: {
      groups: false,
      leafs: false,
    },
  },

  referenceViewOptions: {
    nestedClusters: true,
    viewType: "references",
  },

  methodViewOptions: {
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
