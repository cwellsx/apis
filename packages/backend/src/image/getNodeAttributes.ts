import { AnyNodeType, AreaClass, Closed, Collapsible, Leaf, Node, nodeIdToText, Parent } from "../contracts-ui";

type Attributes = {
  id: string;
  label: string;
  className: AreaClass;
  // if the label is shortened the tooltip is still longer
  tooltip: string;
  nodeType: AnyNodeType;
  attributes: { [key: string]: string };
};

type NonClusterAttributes = Attributes & { type: (Leaf | Closed)["collapsible"] };
type ClusterAttributes = Attributes & { type: Parent["collapsible"]; children: NodeAttributes[] };

export type NodeAttributes = ClusterAttributes | NonClusterAttributes;

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

export const getNodeAttributes = (node: Node): NodeAttributes => {
  const id = nodeIdToText(node.nodeId);
  const tooltip = node.label;
  const type = node.collapsible;
  const className = getAreaClass(type);
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

  if (type != "expanded") return { id, label, className, tooltip, type, nodeType, attributes };

  const children = node.children.map(getNodeAttributes);

  return { id, label, className, tooltip, type, nodeType, attributes, children };
};
