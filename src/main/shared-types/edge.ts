import { EdgeId, NodeId } from "../../shared-types";
import { NodeIdMap } from "./nodeIdUtils";

// this defines the nodes and edges displayed on a graph
// this is an abstraction and this application's native data format
// various input data types for variuous sources are converted to this format for display

// unlike Node which is shared with the render, this is only used within the main process
// therefore extra data (decorations) e.g. labels are stored within this type, instead of in an ImageAttribute lookup

export type Edge = EdgeId & { labels: string[] };

export class Edges {
  private map = new NodeIdMap<NodeIdMap<Edge>>();
  add: (clientId: NodeId, serverId: NodeId, label: string | string[]) => void;
  values: () => Edge[];

  constructor() {
    this.add = (clientId: NodeId, serverId: NodeId, label: string | string[]) => {
      let foundMap = this.map.get(clientId);
      if (!foundMap) {
        foundMap = new NodeIdMap<Edge>();
        this.map.set(clientId, foundMap);
      }
      const foundEdge = foundMap.get(serverId);
      const labels = typeof label === "string" ? [label] : label;
      if (!foundEdge) foundMap.set(serverId, { clientId, serverId, labels });
      else foundEdge.labels.push(...labels);
    };

    this.values = () => this.map.values().flatMap((serverIds) => serverIds.values());
  }
}
