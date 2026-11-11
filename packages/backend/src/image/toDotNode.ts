import { AnyNodeType, isLeaf, Node, nodeIdToText } from "../contracts-ui";

export type DotNode = {
  id: string;
  label: string;
  shortLabel: string;
  nodeType: AnyNodeType;
  attributes: { [key: string]: string };
  node: Node;
};

const getShortLabel = (label: string, parentLabel: string | undefined): string =>
  !parentLabel || !label.startsWith(parentLabel) ? label : "(*)" + label.substring(parentLabel.length);

export const toDotNode = (node: Node): DotNode => {
  const id = nodeIdToText(node.nodeId);
  const label = node.label;
  // A node which can be opened or closed is clickable, and the renderer colours it differently from a leaf.
  // GraphViz merges this with its own class, so the element ends up as e.g. class="node collapsible"
  const className = isLeaf(node) ? "leaf" : "collapsible";
  const shortLabel = getShortLabel(node.label, node.parent?.label);
  const nodeType = node.type;

  const attributes: { [key: string]: string } = { class: className };
  switch (node.type) {
    case "t":
      attributes["style"] = "dotted";
      break;
    case "a":
      attributes["style"] = "filled";
      attributes["fillcolor"] = "#fbfbfb";
      break;
    case "m":
      attributes["color"] = "#999999";
      break;
  }

  return { id, label, shortLabel, nodeType, attributes, node };
};
