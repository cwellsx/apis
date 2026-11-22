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
// rows of an edge popup in the same order
export type EdgeInfo = { nodes: EdgeNodes; labels: EdgeLabels[] };

// map's key values are edgeIdToText
export type EdgePopups = Map<string, EdgeInfo>;

// a row of a node popup's right column: a Label -- a call's remote endpoint -- and which way the call points --
// right when the node is the client of the call, left when it is the server
export type NodeCallRow = Label & { direction: "right" | "left" };

// a node popup's content: the header is the node itself, the left column is its children, and the right column
// is its calls. The children are empty for a leaf, what a closed node would reveal if opened, or what an open
// cluster shows. Children are sorted by type then name; calls by direction then type then name -- as with edges,
// the sort belongs to the model, so every front end shows the rows in the same order
export type NodeInfo = { node: Label; children: Label[]; calls: NodeCallRow[] };

// map's key values are nodeIdToText
export type NodePopups = Map<string, NodeInfo>;
