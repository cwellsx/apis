import type { Node } from "backend-ui";
import { isParent, isMixed } from "backend-ui";

export const printForest = (roots: Node[]): string[] => {
  const result: string[] = [];

  // x visible, - mixed, . visible in none of its ancestors
  const flagOf = (node: Node): string => (node.isVisible ? "x" : isMixed(node) ? "-" : ".");

  const printNode = (node: Node, prefix: string, isLast: boolean, isRoot: boolean): void => {
    const flag = flagOf(node);

    // the flag rides in the horizontal line of the branch, after the first dash, so it
    // never occupies a column of its own. On roots there is no branch, so it leads the line.
    const glyph = isRoot ? "" : prefix + (isLast ? "└" : "├") + "─" + flag + " ";
    result.push(isRoot ? `${flag} ${node.type} ${node.label}` : glyph + `${node.type} ${node.label}`);

    const children = isParent(node) ? node.children : [];

    // For roots, children start with two spaces, reserving the flag column of the tree.
    // For non-roots, children inherit prefix plus vertical/space.
    const childPrefix = isRoot ? "  " : prefix + (isLast ? "    " : "│   ");

    children.forEach((child, index) => {
      const last = index === children.length - 1;
      printNode(child, childPrefix, last, false);
    });
  };

  roots.forEach((root) => printNode(root, "", true, true));

  return result;
};
