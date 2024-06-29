import { GraphViewOptions, GraphViewType } from "./graphViewOptions";
import { EdgeId, NodeId } from "./nodeId";
import { GraphFilter } from "./view";
import { DetailType } from "./viewDetails";

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

export type GraphEvent = { id: NodeId | EdgeId; viewType: GraphViewType; event: MouseEvent };
export type FilterEvent = { graphFilter: GraphFilter; viewOptions: GraphViewOptions };

export type DetailEvent = { id: NodeId; viewType: DetailType };
