import { Node, NodeType, isParent, makeEdgeId, nodeIdToText } from "../contracts-ui";
import type { ImageData, ImageEdge, ImageNode } from "../image";
import { Call, GraphNodes } from "../viewState";

export const createImageData = (graphNodes: GraphNodes): ImageData => {
  const isLeaf = (node: Node): boolean => node.type == graphNodes.leafType;

  const toImageNode = (node: Node): ImageNode => {
    return isLeaf(node)
      ? { type: "leaf", node }
      : !isParent(node)
        ? { type: "closed", node }
        : { type: "subgraph", node, children: node.children.map(toImageNode) };
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
    edgeDetails: graphNodes.leafType == NodeType.Method,
    hasParentEdges: false,
  };
};
