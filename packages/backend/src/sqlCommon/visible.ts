import { isShown, Node } from "../contracts-ui";

export type Visible = { isHidden: boolean; isExpanded: boolean };

export const toVisible = (node: Node): Visible => ({
  isHidden: !isShown(node),
  isExpanded: node.collapsible == "expanded",
});
