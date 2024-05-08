export type ReferenceViewOptions = {
  showGrouped: boolean;
  leafVisible: string[];
  groupExpanded: string[];
  viewType: "references";
};

export type MethodViewOptions = {
  showGrouped: boolean;
  leafVisible: string[];
  groupExpanded: string[];
  topType: "assembly" | "namespace" | "none";
  methodId: {
    assemblyName: string;
    metadataToken: number;
  };
  viewType: "methods";
};

export type ErrorsViewOptions = {
  viewType: "errors";
};

export type GreetingViewOptions = {
  viewType: "greeting";
};

export type GraphViewOptions = ReferenceViewOptions | MethodViewOptions;
export type GraphViewType = "references" | "methods";
