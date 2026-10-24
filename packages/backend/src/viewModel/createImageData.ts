import { NodeType, isMixed, makeEdgeId, nodeIdToText } from "../contracts-ui";
import type { ImageData, ImageEdge } from "../image";
import { Call, GraphNodes } from "../viewState";

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
    nodes: graphNodes.roots.filter((node) => node.isVisible || isMixed(node)),
    edges: graphNodes.calls.map(toImageEdge),
    edgeDetails: graphNodes.leafType == NodeType.Method,
    hasParentEdges: false,
  };
};
