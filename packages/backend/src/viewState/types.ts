import type { Id, Sql } from "../sql2";

export type NodeId = Id.AnyId;

export type NodeState = { isHidden?: boolean; isExpanded?: boolean };

export type Node = { id: NodeId; label: string; children?: Node[]; parent?: Node } & NodeState;

export type ViewType = Sql.ViewType;

export type ViewState = { getTree: () => Node[]; setNodeState: (id: NodeId, nodeState: NodeState) => void };
