import { Node } from "../contracts-ui";

export type Numeric = number | bigint | string;
export type Item<TId extends Numeric> = { id: TId; name: string };

// exported from createDatabase
export type TopT<TId extends Numeric> = { groupItems: Item<TId>[]; rootItems: Item<TId>[] };

export type Top = TopT<number>;
export type CustomTop = TopT<string>;

// roots and node.children are sorted alphabetically
// the key of allNodes is nodeIdToText(node.nodeId)
export type Forest = { roots: Node[]; allNodes: Map<string, Node> };
