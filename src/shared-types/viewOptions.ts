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

export type ApiViewOptions = {
  showGrouped: boolean;
  leafVisible: string[];
  groupExpanded: string[];
  viewType: "apis";
};

export type CustomViewOptions = {
  showGrouped: boolean;
  leafVisible: string[];
  groupExpanded: string[];
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
