import { EdgeId, edgeIdSeparator, NodeId, nodeIdToText, textToEdgeId, textToNodeId } from "../contracts-ui";

// this defines the edges displayed on a graph
// Node (including but not only NodeId) is shared with the render, but Edge is only used within the main process
// therefore extra data (decorations) e.g. labels are stored within this type, instead of in an ImageAttribute lookup

export type Edge = { edgeId: EdgeId; labels: string[]; clientId: NodeId; serverId: NodeId; isServerLeaf: boolean };

export const edgeIdToText = (edgeId: EdgeId): string => edgeId["edgeId"];

export const edgeIdToNodeIds = (edgeId: EdgeId): { clientId: NodeId; serverId: NodeId } => {
  const split = edgeIdToText(edgeId).split(edgeIdSeparator);
  return { clientId: textToNodeId(split[0]), serverId: textToNodeId(split[1]) };
};

export const makeUniqueEdgeId = (edgeId: string, index: number): string => `${edgeId}-${index}`;

const makeEdgeId = (clientId: NodeId, serverId: NodeId): string =>
  `${nodeIdToText(clientId)}${edgeIdSeparator}${nodeIdToText(serverId)}`;

export const isEdgeId = (id: NodeId | EdgeId): id is EdgeId => (id as EdgeId).edgeId !== undefined;

export class Edges {
  private data = new Map<string, Edge>();
  addOrUpdate: (clientId: NodeId, serverId: NodeId, label: string | string[], isServerLeaf: boolean) => void;
  values: () => Edge[];

  constructor() {
    this.addOrUpdate = (clientId: NodeId, serverId: NodeId, label: string | string[], isServerLeaf: boolean) => {
      const edgeId = makeEdgeId(clientId, serverId);
      const edge = this.data.get(edgeId);
      const labels = typeof label === "string" ? [label] : label;
      if (!edge) this.data.set(edgeId, { edgeId: textToEdgeId(edgeId), clientId, serverId, labels, isServerLeaf });
      else edge.labels.push(...labels);
    };

    this.values = () => [...this.data.values()];
  }
}
