import { ApiViewOptions, CustomViewOptions, MethodViewOptions, ReferenceViewOptions } from "./graphViewOptions";
import { NodeId } from "./nodeId";
import { GraphViewType } from "./viewType";

export type GraphViewOptions = ReferenceViewOptions | MethodViewOptions | ApiViewOptions | CustomViewOptions;

export const viewFeatures: Record<GraphViewType, { leafType: NodeId["type"]; details: ("leaf" | "edge")[] }> = {
  references: { leafType: "assembly", details: ["leaf"] },
  apis: { leafType: "type", details: ["edge"] },
  custom: { leafType: "customLeaf", details: [] },
  methods: { leafType: "method", details: ["leaf"] },
};

export type AnyGraphViewOptions = Partial<
  Omit<ReferenceViewOptions, "viewType"> &
    Omit<MethodViewOptions, "viewType"> &
    Omit<ApiViewOptions, "viewType"> &
    Omit<CustomViewOptions, "viewType">
>;

export type CompilerViewOptions = {
  viewType: "compiler";
  errorsOnly: boolean;
};

type TextViewOptions = CompilerViewOptions;

export type ViewOptions = GraphViewOptions | TextViewOptions;
