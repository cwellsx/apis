import type { Database, Item } from "./createDatabase";
import type { Node } from "./types";

export const getTrunk = (database: Database): Node[] => {
  const { groups, roots } = database;

  const result: Node[] = [];

  const findParents = (items: Item[]) => {
    const input = new Set<Item>(items);
    for (let level = 1; input.size; ++level) {
      input.forEach((item) => {
        if (item.name.split(".").length != level) return;
        const findParent = (previous: Node | undefined, current: Node): Node | undefined => {
          if (!item.name.startsWith(current.label)) return previous;
          if (previous && previous.label.length > current.label.length) return previous;
          return current;
        };
        const parent = result.reduce(findParent, undefined);
        const thisNode: Node = { id: item.id, label: item.name };
        if (parent) {
          if (!parent.children) parent.children = [thisNode];
          else parent.children.push(thisNode);
          thisNode.parent = parent;
        }
        result.push(thisNode);
        input.delete(item);
      });
    }
  };

  findParents(groups);
  findParents(roots);

  return result;
};
