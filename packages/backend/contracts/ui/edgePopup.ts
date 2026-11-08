import { NodeId } from "./nodeId";

export type EdgeLabel = { label: string; nodeId: NodeId };
export type EdgeLabels = { client: EdgeLabel; server: EdgeLabel };
export type EdgePopups = Map<string, EdgeLabels[]>;
