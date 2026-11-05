import { AnyNodeType, AreaClass, Collapsible, Node, nodeIdToText } from "../contracts-ui";

export type DotNode = {
  id: string;
  label: string;
  className: AreaClass;
  // if the label is shortened the tooltip is still longer
  tooltip: string;
  nodeType: AnyNodeType;
  attributes: { [key: string]: string };
  node: Node;
};

const getAreaClass = (collapsible: Collapsible): AreaClass => {
  switch (collapsible) {
    case "expanded":
      return "expanded";
    case "collapsed":
      return "closed";
    case "none":
      return "leaf-details";
  }
};

const getShortLabel = (label: string, parentLabel: string | undefined): string =>
  !parentLabel || !label.startsWith(parentLabel) ? label : "(*)" + label.substring(parentLabel.length);

export const getDotNode = (node: Node): DotNode => {
  const id = nodeIdToText(node.nodeId);
  const tooltip = node.label;
  const className = getAreaClass(node.collapsible);
  const label = getShortLabel(node.label, node.parent?.label);
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

  return { id, label, className, tooltip, nodeType, attributes, node };
};
