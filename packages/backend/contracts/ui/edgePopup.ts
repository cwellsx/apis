import { Node } from "./node";
import { NodeId } from "./nodeId";

export type Label = { label: string; nodeId: NodeId };

type EdgeT<T> = { client: T; server: T };

export type EdgeLabels = EdgeT<Label>;
export type EdgeNodes = EdgeT<Node>;

// the labels are sorted by client label, ties broken by server label, so that every front end shows the
// rows of a popup in the same order
export type EdgeInfo = { nodes: EdgeNodes; labels: EdgeLabels[] };

// map's key values are edgeIdToText
export type EdgePopups = Map<string, EdgeInfo>;
