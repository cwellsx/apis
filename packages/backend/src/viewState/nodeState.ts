import { isVisible, Node } from "../contracts-ui";

export type NodeState = { isHidden: boolean; isExpanded: boolean };

export const getNodeState = (node: Node): NodeState => ({
  isHidden: !isVisible(node),
  isExpanded: node.collapsible == "expanded",
});
