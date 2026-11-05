import { NodeId } from "./nodeId";
import { AnyNodeType } from "./nodeTypes";

export type NodeLabel = { label: string; nodeId: NodeId; type: AnyNodeType };

export type EdgeLabel = { clientLabel: NodeLabel; serverLabel: NodeLabel };

export type EdgePopup = Map<string, EdgeLabel[]>;
