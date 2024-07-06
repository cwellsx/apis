import { CompilerMethod } from "./compilerMethod";
import { CustomError } from "./customError";
import { ErrorsInfo } from "./errors";
import { GraphViewOptions } from "./graphViewOptions";
import { Image } from "./image";
import { Node } from "./node";
import { NodeId } from "./nodeId";

/*
  The types of View are distinguished by the viewType which is an element of every viewOptions
*/

export type GraphFilter = {
  leafVisible: NodeId[];
  groupExpanded: NodeId[];
};

export type ViewGraph = {
  // string is a message if there isn't an Image
  image: Image | string;

  // could send null if previously-sent Groups has not changed
  // but that would require useState and useEffect in the render
  // https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
  groups: Node[];

  graphFilter: GraphFilter;
  viewOptions: GraphViewOptions;
};

export type ViewGreeting = {
  viewType: "greeting";
  greeting: string;
};

export type ViewErrors = {
  viewType: "errors";
  errors?: ErrorsInfo[];
};

export type ViewCustomErrors = {
  viewType: "customErrors";
  customErrors?: CustomError[];
};

export type ViewCompilerMethods = {
  viewType: "compilerMethods";
  compilerMethods: CompilerMethod[];
};

export type ViewText = ViewGreeting | ViewErrors | ViewCustomErrors | ViewCompilerMethods;

export type View = ViewGraph | ViewText;

export type ViewType =
  | "references"
  | "methods"
  | "errors"
  | "greeting"
  | "apis"
  | "custom"
  | "compilerMethods"
  | "customErrors";

export const defaultView: ViewGreeting = {
  greeting: "No data",
  viewType: "greeting",
};
