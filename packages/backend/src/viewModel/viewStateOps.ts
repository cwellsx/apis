import { AnyNodeType, GraphFilter, Node, NodeId, nodeIdToText } from "../contracts-ui";
import { assert } from "../utils";
import { GraphNodes, ViewState } from "../viewState";

const nodeIdEquals = (x: NodeId, y: NodeId): boolean => nodeIdToText(x) == nodeIdToText(y);

export const getNodeOrThrow = (nodeId: NodeId, graphNodes: GraphNodes): Node => {
  const node = graphNodes.forest.allNodes.find((node) => nodeIdEquals(node.nodeId, nodeId));
  assert(!!node);
  return node;
};

export const toggleExpanded = (id: NodeId, type: AnyNodeType, graphNodes: GraphNodes, viewState: ViewState): void => {
  const isExpanded = !!graphNodes.graphFilter.groupExpanded.find((it) => nodeIdEquals(it, id));
  const isVisible = !!graphNodes.graphFilter.leafVisible.find((it) => nodeIdEquals(it, id));
  viewState.setNodeState(id, type, { isHidden: isVisible, isExpanded: !isExpanded });
};

export const writeGraphFilter = (graphFilter: GraphFilter, graphNodes: GraphNodes, viewState: ViewState): void => {
  graphNodes.forest.allNodes.forEach((node) => {
    const { nodeId: id, type } = node;
    const isExpanded = !!graphFilter.groupExpanded.find((it) => nodeIdEquals(it, id));
    const isVisible = !!graphFilter.leafVisible.find((it) => nodeIdEquals(it, id));
    viewState.setNodeState(id, type, { isHidden: !isVisible, isExpanded: isExpanded });
  });
};
