import type { Node } from "../contracts-ui";

export type Forest = { roots: Node[]; allNodes: Node[] };
export type GetForest = () => Forest;

export type Top = { groups: Node[]; roots: Node[] };

export type Leafs = { typeNames: Node[]; methodNames: Node[]; parents: Map<string, string> };
