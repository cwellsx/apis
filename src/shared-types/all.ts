import { MethodBody } from "./methodBody";
import { Types } from "./types";
import { ErrorsViewOptions, GreetingViewOptions, MethodViewOptions, ReferenceViewOptions } from "./viewOptions";
import { ViewGraph, ViewGreeting } from "./views";

export type AllViewOptions = ReferenceViewOptions | MethodViewOptions | ErrorsViewOptions | GreetingViewOptions;

export type ViewType = "references" | "methods" | "errors" | "greeting";

export type View = ViewGraph | ViewGreeting;
export type ViewDetails = MethodBody | Types;

const defaultGreeting = "No data";
export const defaultView: ViewGreeting = {
  greeting: defaultGreeting,
  viewOptions: {
    viewType: "greeting",
  },
};
