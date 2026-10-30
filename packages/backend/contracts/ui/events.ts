import { AppOptions } from "./appOptions";
import { EdgeId, NodeId } from "./nodeId";
import { NodeState } from "./nodeState";
import { AnyNodeType } from "./nodeTypes";
//import { DetailType } from "./viewDetails";

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

export type GraphEvent = { id: NodeId | EdgeId; event: MouseEvent };

export type NewNodeState = { id: NodeId; nodeType: AnyNodeType; nodeState: NodeState };
export type FilterEvent = NewNodeState[];

//export type DetailEvent = { id: NodeId; viewType: DetailType };

export type AnyEvent =
  | { type: "appOptions"; payload: AppOptions }
  | { type: "graph"; payload: GraphEvent }
  | { type: "filter"; payload: FilterEvent };
//  | { type: "detail"; payload: DetailEvent };
