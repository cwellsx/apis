import { EdgeId, makeEdgeId, NodeId, textToEdgeId } from "../contracts-ui";

// this defines the edges displayed on a graph
// Node (including but not only NodeId) is shared with the render, but Edge is only used within the main process
// therefore extra data (decorations) e.g. labels are stored within this type, instead of in an ImageAttribute lookup

type Edge = { edgeId: EdgeId; labels: string[]; clientId: NodeId; serverId: NodeId; isServerLeaf: boolean };

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
