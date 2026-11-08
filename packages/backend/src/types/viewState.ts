import type { AnyLeafType, AnyNodeType, EdgePopups, Node, NodeId, NodeState } from "../contracts-ui";
import { ImageData } from "./image";

export type GraphNodes = {
  imageData: ImageData;
  edgePopups?: EdgePopups;
  leafType: AnyLeafType;
  getNode: (nodeId: NodeId) => Node;
  findNode: (predicate: (node: Node) => boolean) => Node | undefined;
};

/*
  The implementation of setNodeState depends on GraphNodes because the algortithm depends on the node's ancestors.

  There are three ways to implement this:

  1. Pass GraphNodes as a parameter into setNodeState
  2. Make setNodeState an element of GraphNodes instead of ViewState
  3. Call getGraphNodes in the implementation of setNodeStates

  Decision is to prefer the first solution -- so that GraphNodes is immutable and an explicit (not a hidden) dependency
*/

export type SetNodeState = (nodeId: NodeId, nodeType: AnyNodeType, nodeState: NodeState, graphNode: GraphNodes) => void;

export type ViewState = { getGraphNodes: () => GraphNodes; setNodeState: SetNodeState; resetNodeStates: () => void };
