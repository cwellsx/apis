import { Node } from "../contracts-ui";
import * as Id from "../id2";

export type Numeric = number | bigint | string;
export type Item<TId extends Numeric> = { id: TId; name: string };

// exported from createDatabase
export type TopT<TId extends Numeric> = { groupItems: Item<TId>[]; rootItems: Item<TId>[] };

export type Top = TopT<number>;

export type Leafs = {
  typeItems: Item<Id.TypeDefId>[];
  methodItems: Item<Id.MethodDefId>[];
  parentItems: Map<Id.AnyCoreId, Id.AnyCoreId>;
};

// roots and node.children are sorted alphabetically
// the key of allNodes is nodeIdToText(node.nodeId)
export type Forest = { roots: Node[]; allNodes: Map<string, Node> };
