import { AnyNodeType, AreaClass, nodeIdToText } from "../contracts-ui";
import { ImageClosed, ImageLeaf, ImageNode, ImageNodeType, ImageSubgraph } from "./imageDataTypes";

type Attributes = {
  id: string;
  label: string;
  className: AreaClass;
  // if the label is shortened the tooltip is still longer
  tooltip: string;
  nodeType: AnyNodeType;
  attributes: { [key: string]: string };
};

type NonClusterAttributes = Attributes & { type: (ImageLeaf | ImageClosed)["type"] };
type ClusterAttributes = Attributes & { type: ImageSubgraph["type"]; children: NodeAttributes[] };

export type NodeAttributes = ClusterAttributes | NonClusterAttributes;

const getAreaClass = (type: ImageNodeType): AreaClass => {
  switch (type) {
    case "subgraph":
      return "expanded";
    case "closed":
      return "closed";
    case "leaf":
      return "leaf-details";
  }
};

const getShortLabel = (label: string, parentLabel: string | undefined): string =>
  !parentLabel || !label.startsWith(parentLabel) ? label : "(*)" + label.substring(parentLabel.length);

export const getNodeAttributes = (imageNode: ImageNode): NodeAttributes => {
  const { type, node } = imageNode;
  const id = nodeIdToText(node.nodeId);
  const tooltip = node.label;
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

  if (type != "subgraph") return { id, label, className, tooltip, type, nodeType, attributes };

  const children = imageNode.children.map(getNodeAttributes);

  return { id, label, className, tooltip, type, nodeType, attributes, children };
};
