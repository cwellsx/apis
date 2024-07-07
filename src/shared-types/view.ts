import { CompilerMethod } from "./compilerMethod";
import { CustomError } from "./customError";
import { ErrorsInfo } from "./errors";
import { GraphFilter } from "./graphFilter";
import { Image } from "./image";
import { Node } from "./node";
import { CompilerViewOptions, GraphViewOptions } from "./viewOptions";

/*
  The types of View are distinguished by the viewType which is an element of every viewOptions
*/

export type ViewGraph = {
  // string is a message if there isn't an Image
  image: Image | string;

  // could send null if previously-sent Groups has not changed
  // but that would require useState and useEffect in the render
  // https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
  groups: Node[];

  graphFilter: GraphFilter;
  graphViewOptions: GraphViewOptions;
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

export type ViewCompiler = {
  viewType: "compilerMethods";
  compilerMethods: CompilerMethod[];
  textViewOptions: CompilerViewOptions;
};

export type ViewText = ViewGreeting | ViewErrors | ViewCustomErrors | ViewCompiler;

export type View = ViewGraph | ViewText;

export const defaultView: ViewGreeting = {
  greeting: "No data",
  viewType: "greeting",
};
