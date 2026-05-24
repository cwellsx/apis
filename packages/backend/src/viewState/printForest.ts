import type { Node } from "../contracts-ui";
import { isParent } from "../contracts-ui";
import { Forest } from "./forest";

export const printForest = (forest: Forest): string[] => {
  const result: string[] = [];

  const printNode = (node: Node, prefix: string, isLast: boolean, isRoot: boolean): void => {
    const branch = isRoot ? "" : prefix + (isLast ? "└── " : "├── ");
    result.push(branch + `${node.type} ${node.label}`);

    const children = isParent(node) ? node.children : [];

    // For roots, children start with empty prefix.
    // For non-roots, children inherit prefix plus vertical/space.
    const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");

    children.forEach((child, index) => {
      const last = index === children.length - 1;
      printNode(child, childPrefix, last, false);
    });
  };

  forest.roots.forEach((root) => printNode(root, "", true, true));

  return result;
};
