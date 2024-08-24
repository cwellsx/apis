import { ApiViewOptions, CustomViewOptions, MethodViewOptions, ReferenceViewOptions } from "./graphViewOptions";

export type GraphViewOptions = ReferenceViewOptions | MethodViewOptions | ApiViewOptions | CustomViewOptions;

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

export const isCustomViewOptions = (viewOptions: ViewOptions): viewOptions is CustomViewOptions =>
  viewOptions.viewType === "custom";
