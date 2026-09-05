import { isGroupExpanded, isLeafVisible } from "../../contracts/ui/graphFilter";
import { AnyNodeType, GraphFilter, Node, NodeId, nodeIdEquals } from "../contracts-ui";
import { assert } from "../utils";
import { GraphNodes, ViewState } from "../viewState";

export const getNodeOrThrow = (nodeId: NodeId, graphNodes: GraphNodes): Node => {
  const node = graphNodes.forest.allNodes.find((node) => nodeIdEquals(node.nodeId, nodeId));
  assert(!!node);
  return node;
};

export const toggleExpanded = (id: NodeId, type: AnyNodeType, graphNodes: GraphNodes, viewState: ViewState): void => {
  const isExpanded = isGroupExpanded(id, graphNodes.graphFilter);
  const isVisible = isLeafVisible(id, graphNodes.graphFilter);
  viewState.setNodeState(id, type, { isHidden: isVisible, isExpanded: !isExpanded });
};

export const writeGraphFilter = (graphFilter: GraphFilter, graphNodes: GraphNodes, viewState: ViewState): void => {
  graphNodes.forest.allNodes.forEach((node) => {
    const { nodeId: id, type } = node;
    const isExpanded = isGroupExpanded(id, graphFilter);
    const isVisible = isLeafVisible(id, graphFilter);
    viewState.setNodeState(id, type, { isHidden: !isVisible, isExpanded: isExpanded });
  });
};
