import type { Id, Sql } from "../sql2";

export type NodeId = Id.AnyId;

export type NodeState = { isHidden?: boolean; isExpanded?: boolean };

export type NodeType = "g" | "a" | "n" | "t" | "m";
export type NodeItem = { id: NodeId; label: string; type: NodeType };
export type Node = NodeItem & { children?: Node[]; parent?: Node } & NodeState;

export type ViewType = Sql.ViewType;

export type ViewState = { getTree: () => Node[]; setNodeState: (id: NodeId, nodeState: NodeState) => void };
