import { Node } from "./node";
import { NodeId } from "./nodeId";
import { AnyNodeType } from "./nodeTypes";

// the node type is what a popup shows an icon for, so that a row says what kind of thing each end is: a namespace
// and a type are otherwise indistinguishable by name alone
export type Label = { label: string; nodeId: NodeId; type: AnyNodeType };

type EdgeT<T> = { client: T; server: T };

export type EdgeLabels = EdgeT<Label>;
export type EdgeNodes = EdgeT<Node>;

// the labels are sorted by client label, ties broken by server label, so that every front end shows the
// rows of a popup in the same order
export type EdgeInfo = { nodes: EdgeNodes; labels: EdgeLabels[] };

// map's key values are edgeIdToText
export type EdgePopups = Map<string, EdgeInfo>;
