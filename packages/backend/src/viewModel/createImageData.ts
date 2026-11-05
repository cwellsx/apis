import { NodeType, makeEdgeId, nodeIdToText } from "../contracts-ui";
import type { Call, GraphNodes, ImageData, ImageEdge } from "../types";

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
    nodes: graphNodes.roots,
    edges: graphNodes.edges.map(toImageEdge),
    edgeDetails: graphNodes.leafType == NodeType.Method,
  };
};
