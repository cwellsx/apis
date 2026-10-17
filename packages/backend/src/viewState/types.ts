import type { AnyLeafType, AnyNodeType, Node, NodeId, NodeState } from "../contracts-ui";

export type Call = { fromId: NodeId; toId: NodeId };

export type GraphNodes = {
  roots: Node[];
  calls: Call[];
  leafType: AnyLeafType;
  getNode: (nodeId: NodeId) => Node;
  findNode: (predicate: (node: Node) => boolean) => Node | undefined;
};

export type SetNodeState = (nodeId: NodeId, nodeType: AnyNodeType, nodeState: NodeState, graphNode: GraphNodes) => void;

export type ViewState = { getGraphNodes: () => GraphNodes; setNodeState: SetNodeState; resetNodeStates: () => void };

/*

The implementation of setNodeState depends on GraphNodes i.e. ancestors.

There are three ways to implement this:

1. Pass GraphNodes as a parameter into setNodeState
2. Make setNodeState an element of GraphNodes instead of ViewState
3. Call getGraphNodes in the implementation of setNodeStates

Decision:

1. Least bad
2. GraphNodes should be immutable read-only data
3. Hidden dependency

*/
