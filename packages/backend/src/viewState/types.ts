import { Node } from "../contracts-ui";
import * as Id from "../id2";

export type Numeric = number | bigint;
export type Item<TId extends Numeric> = { id: TId; name: string };

// exported from createDatabase
export type Top = { groupItems: Item<number>[]; rootItems: Item<number>[] };

export type Leafs = {
  typeItems: Item<Id.TypeDefId>[];
  methodItems: Item<Id.MethodDefId>[];
  parentItems: Map<Id.AnyId, Id.AnyId>;
};

// roots and node.children are sorted alphabetically -- allNodes is unsorted
export type Forest = { roots: Node[]; allNodes: Node[] };
