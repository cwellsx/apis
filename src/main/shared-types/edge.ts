import { NodeId } from "../../shared-types";

// this defines the nodes and edges displayed on a graph
// this is an abstraction and this application's native data format
// various input data types for variuous sources are converted to this format for display

export type Edge = {
  clientId: NodeId;
  serverId: NodeId;
  label?: string;
};
