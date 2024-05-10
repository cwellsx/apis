import { MethodBody } from "./methodBody";
import { Types } from "./types";
import type {
  ApiViewOptions,
  ErrorsViewOptions,
  GraphViewOptions,
  GreetingViewOptions,
  MethodViewOptions,
  ReferenceViewOptions,
} from "./viewOptions";
import { graphViewTypes } from "./viewOptions";
import { ViewErrors, ViewGraph, ViewGreeting } from "./views";

export type AllViewOptions =
  | ReferenceViewOptions
  | MethodViewOptions
  | ErrorsViewOptions
  | GreetingViewOptions
  | ApiViewOptions;

export function isGraphViewOptions(viewOptions: AllViewOptions): viewOptions is GraphViewOptions {
  return graphViewTypes.includes(viewOptions.viewType);
}

export type ViewType = "references" | "methods" | "errors" | "greeting" | "apis";

export type View = ViewGraph | ViewGreeting | ViewErrors;

export type ViewDetails = MethodBody | Types;

const defaultGreeting = "No data";
export const defaultView: ViewGreeting = {
  greeting: defaultGreeting,
  viewOptions: {
    viewType: "greeting",
  },
};
