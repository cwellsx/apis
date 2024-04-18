import { Groups } from "./grouped";
import { Image } from "./image";
import { ViewOptions } from "./options";

export type View = {
  image: Image | string; // string is a message if there isn't an Image
  // could send null if previously-sent Groups has not changed
  // but that would require useState and useEffect in the render
  // https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state
  groups: Groups;
  leafVisible: string[];
  groupExpanded: string[];
  viewOptions: ViewOptions;
};
