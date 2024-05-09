import { Image } from "./image";
import { MethodBody } from "./methodBody";
import { Node } from "./treeNodes";
import { ErrorsViewOptions, GraphViewOptions, GreetingViewOptions } from "./viewOptions";

export type ViewGraph = {
  // string is a message if there isn't an Image
  image: Image | string;

  // could send null if previously-sent Groups has not changed
  // but that would require useState and useEffect in the render
  // https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
  groups: Node[];

  viewOptions: GraphViewOptions;
};

export type ViewGreeting = {
  greeting: string;
  viewOptions: GreetingViewOptions;
};

export type ViewErrors = {
  methods: MethodBody[];
  viewOptions: ErrorsViewOptions;
};
