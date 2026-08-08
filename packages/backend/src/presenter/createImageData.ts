import { Node, NodeType, isParent, makeEdgeId, nodeIdToText } from "../contracts-ui";
import type { ImageAttribute, ImageData, ImageEdge, ImageNode, ImageText } from "../image";
import { viewFeatures } from "../utils";
import { Call, GraphNodes } from "../viewState";

export const createImageData = (graphNodes: GraphNodes): ImageData => {
  const { details } = viewFeatures[graphNodes.graphViewType];

  const isLeaf = (node: Node): boolean => node.type == NodeType.Method || node.type == NodeType.Custom;

  const toImageNode = (node: Node): ImageNode => {
    const nodeId = node.nodeId;

    const imageAttribute: ImageAttribute = {};

    const textNode: ImageText = {
      id: nodeIdToText(nodeId),
      label: node.label,
      className:
        (imageAttribute.className ?? !isLeaf(node))
          ? isParent(node)
            ? "expanded"
            : "closed"
          : details.includes("leaf")
            ? "leaf-details"
            : "leaf-none",
      ...imageAttribute,
    };

    return isLeaf(node)
      ? { type: "node", ...textNode }
      : !isParent(node)
        ? { type: "group", ...textNode }
        : { type: "subgraph", ...textNode, children: node.children.map(toImageNode) };
  };

  const toImageEdge = (call: Call): ImageEdge => {
    const clientId = nodeIdToText(call.fromId);
    const serverId = nodeIdToText(call.toId);
    const edgeId = makeEdgeId(call.fromId, call.toId);
    const labels: string[] = [];
    const titles: string[] = [];
    return { clientId, serverId, edgeId, labels, titles };
  };

  return {
    nodes: graphNodes.forest.roots.map(toImageNode),
    edges: graphNodes.calls.map(toImageEdge),
    edgeDetails: details.includes("edge"),
    hasParentEdges: false,
  };
};
