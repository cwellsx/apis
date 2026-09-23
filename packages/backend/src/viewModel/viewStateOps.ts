import { isGroupExpanded, isLeafVisible } from "../../contracts/ui/graphFilter";
import { GraphFilter, Node, NodeId, nodeIdEquals } from "../contracts-ui";
import { assert } from "../utils";
import { GraphNodes, ViewState } from "../viewState";

export const getNodeOrThrow = (nodeId: NodeId, graphNodes: GraphNodes): Node => {
  const node = graphNodes.forest.allNodes.find((node) => nodeIdEquals(node.nodeId, nodeId));
  assert(!!node);
  return node;
};

export const writeGraphFilter = (graphFilter: GraphFilter, graphNodes: GraphNodes, viewState: ViewState): void => {
  graphNodes.forest.allNodes.forEach((node) => {
    const { nodeId: id, type } = node;
    const isExpanded = isGroupExpanded(id, graphFilter);
    const isVisible = isLeafVisible(id, graphFilter);
    viewState.setNodeState(id, type, { isHidden: !isVisible, isExpanded: isExpanded });
  });
};
