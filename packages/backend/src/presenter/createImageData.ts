import { Node, NodeType, makeEdgeId, nodeIdToText } from "../contracts-ui";
import type { ImageData, ImageEdge } from "../image";
import { Call, GraphNodes } from "../viewState";

const isVisibleOrMixed = (node: Node): boolean => node.isShown != false;

export const createImageData = (graphNodes: GraphNodes): ImageData => {
  const toImageEdge = (call: Call): ImageEdge => {
    const clientId = nodeIdToText(call.fromId);
    const serverId = nodeIdToText(call.toId);
    const edgeId = makeEdgeId(call.fromId, call.toId);
    const labels: string[] = [];
    const titles: string[] = [];
    return { clientId, serverId, edgeId, labels, titles };
  };

  return {
    nodes: graphNodes.forest.roots.filter(isVisibleOrMixed),
    edges: graphNodes.calls.map(toImageEdge),
    edgeDetails: graphNodes.leafType == NodeType.Method,
    hasParentEdges: false,
  };
};
