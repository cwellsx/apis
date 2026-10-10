import type { AnyLeafType, AnyNodeType, Node, NodeId } from "../contracts-ui";
import { Visible } from "../sqlCommon";

export type Call = { fromId: NodeId; toId: NodeId };

export type GraphNodes = {
  roots: Node[];
  calls: Call[];
  leafType: AnyLeafType;
  getNode: (nodeId: NodeId) => Node;
  findNode: (predicate: (node: Node) => boolean) => Node | undefined;
};

export type ViewState = {
  getGraphNodes: () => GraphNodes;
  setNodeState: (id: NodeId, nodeType: AnyNodeType, nodeState: Visible) => void;
  resetNodeStates: () => void;
};
