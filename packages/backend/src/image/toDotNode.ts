import { AnyNodeType, Node, nodeIdToText } from "../contracts-ui";

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
  // const className = getAreaClass(node.collapsible);
  const shortLabel = getShortLabel(node.label, node.parent?.label);
  const nodeType = node.type;

  const attributes: { [key: string]: string } = {};
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
