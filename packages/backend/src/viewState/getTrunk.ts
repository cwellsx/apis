import { compareOrdinal } from "../utils";
import type { Database } from "./createDatabase";
import type { Node, NodeItem } from "./types";

export const getTrunk = (database: Database): Node[] => {
  const top: Node[] = [];
  const more: Node[] = [];

  const both = (): Node[] => top.concat(more);

  const sortNodes = (nodes: Node[]): void => {
    nodes.sort((x, y) => compareOrdinal(x.label, y.label));
  };

  const findParent = (nodeItem: NodeItem) => {
    const callbackfn = (previous: Node | undefined, current: Node): Node | undefined => {
      if (!nodeItem.label.startsWith(current.label)) return previous;
      if (previous && previous.label.length > current.label.length) return previous;
      return current;
    };
    return both().reduce(callbackfn, undefined);
  };

  const insert = (array: Node[], node: Node): void => {
    let lo = 0;
    let hi = array.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (array[mid].label < node.label) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    array.splice(lo, 0, node);
  };

  const findParents = (layer: Node[]): void => {
    const pairs = layer.map((value) => ({ node: value, parent: findParent(value) }));
    pairs.forEach((pair) => {
      const { node, parent } = pair;
      if (parent) {
        if (!parent.children) parent.children = [node];
        else insert(parent.children, node);
        node.parent = parent;
        more.push(node);
      } else insert(top, node);
    });
  };

  const handleGroups = (groups: Node[]) => {
    for (let level = 1; ; ++level) {
      const layer = groups.filter((value) => value.label.split(".").length == level);
      if (!layer.length) return;
      if (level == 1) {
        top.push(...layer);
        sortNodes(top);
      } else findParents(layer);
    }
  };

  handleGroups(database.groups);
  findParents(database.roots);

  return both();
};
