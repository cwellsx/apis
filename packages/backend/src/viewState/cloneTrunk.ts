import type { Node, Parent } from "../contracts-ui";
import { isParent } from "../contracts-ui";
import type { Forest, GetForest } from "./forest";

export const cloneTrunk = (forest: Forest): GetForest => {
  const cloneForest = (): Forest => {
    const newForest: Forest = { roots: [], allNodes: [] };

    const cloneNode = (node: Node, parent: Parent | null) => {
      const copy: Node = {
        nodeId: node.nodeId,
        label: node.label,
        type: node.type,

        parent,
        children: undefined,
      };

      if (isParent(node)) {
        const copyParent = copy as Parent;
        copyParent.children = node.children.map((child) => cloneNode(child, copyParent));
      }

      newForest.allNodes.push(copy);
      return copy;
    };

    forest.roots.forEach((root) => newForest.roots.push(cloneNode(root, null)));
    return newForest;
  };
  const getForest = () => cloneForest();
  return getForest;
};
