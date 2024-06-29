import { CustomError } from "./customError";
import { ErrorsInfo } from "./errors";
import { Image } from "./image";
import { Node } from "./node";
import {
  ErrorsViewOptions,
  GraphFilter,
  GraphViewOptions,
  GreetingViewOptions,
  WantedViewOptions,
} from "./viewOptions";
import { Wanted } from "./wanted";

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

  viewOptions: GraphViewOptions;
};

export type ViewGreeting = {
  greeting: string;
  viewOptions: GreetingViewOptions;
};

export type ViewErrors = {
  customErrors?: CustomError[];
  errors?: ErrorsInfo[];
  viewOptions: ErrorsViewOptions;
};

export type ViewWanted = {
  wanted: Wanted[];
  viewOptions: WantedViewOptions;
};

export type View = ViewGraph | ViewGreeting | ViewErrors | ViewWanted;

export const defaultView: ViewGreeting = {
  greeting: "No data",
  viewOptions: {
    viewType: "greeting",
  },
};
