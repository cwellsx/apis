import type { Node, Parent } from "../contracts-ui";
import { isParent, nodeIdToText } from "../contracts-ui";
import { compareOrdinal, getOrThrow } from "../utils";
import type { Forest, Leafs, Top } from "./forest";

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

const convertNodeToParent = (node: Node): Parent => {
  if (!isParent(node)) {
    const parent = node as Parent;
    parent.children = [];
    return parent;
  }
  return node;
};

export const getTrunk = (top: Top): Forest => {
  const forest: Forest = { roots: [], allNodes: [] };

  const sortNodes = (nodes: Node[]): void => {
    nodes.sort((x, y) => compareOrdinal(x.label, y.label));
  };

  const findParent = (node: Node): Parent | undefined => {
    const callbackfn = (previous: Node | undefined, current: Node): Node | undefined => {
      if (!node.label.startsWith(current.label)) return previous;
      if (previous && previous.label.length > current.label.length) return previous;
      return current;
    };
    const result = forest.allNodes.reduce(callbackfn, undefined);
    if (!result) return result;
    return convertNodeToParent(result);
  };

  const findParents = (layer: Node[]): void => {
    const pairs = layer.map((value) => ({ node: value, parent: findParent(value) }));
    pairs.forEach((pair) => {
      const { node, parent } = pair;
      if (parent) {
        insert(parent.children, node);
        node.parent = parent;
      } else insert(forest.roots, node);
      forest.allNodes.push(node);
    });
  };

  const handleGroups = (groups: Node[]) => {
    for (let level = 1; ; ++level) {
      const layer = groups.filter((value) => value.label.split(".").length == level);
      if (!layer.length) return;
      if (level == 1) {
        sortNodes(layer);
        forest.roots.push(...layer);
        forest.allNodes.push(...layer);
      } else findParents(layer);
    }
  };

  handleGroups(top.groups);
  findParents(top.roots);

  return forest;
};

export const addLeafs = (trunk: Forest, leafs: Leafs): void => {
  const parents = leafs.parents;
  const allNodes = new Map<string, Node>(trunk.allNodes.map((value) => [nodeIdToText(value.nodeId), value]));

  const addToParents = (children: Node[]) =>
    children.forEach((child) => {
      const childId = nodeIdToText(child.nodeId);
      const parentId = getOrThrow(parents, childId);
      const found = getOrThrow(allNodes, parentId);
      const parent = convertNodeToParent(found);
      insert(parent.children, child);
      child.parent = parent;
      allNodes.set(childId, child);
      trunk.allNodes.push(child);
    });

  addToParents(leafs.typeNames);
  addToParents(leafs.methodNames);
};
