import { AreaClass } from "./image";
import { GraphViewType } from "./viewOptions";

// import OnGraphClick into the renderer-side code, but avoid importing MouseEvent
// because it can be confusing because there's also a React.MouseEvent and a DOM MouseEvent
type MouseEvent = {
  altKey: boolean;
  button: number;
  buttons: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export type GraphEvent = { id: string; className: AreaClass; viewType: GraphViewType; event: MouseEvent };
