import { NodeId } from "./nodeId";

// these are nodes in the tree of checkboxes
// they show how graph nodes are grouped and control which groups are expanded
// they don't show edges and node properties and don't need more data than this
// extra data (decorators) are defined in ImageAttribute

export type Leaf = {
  label: string;
  nodeId: NodeId; // unique within graph and/or within group tree
  parent: Parent | null;
};

export type Parent = Leaf & {
  children: Node[];
};

export type Node = Leaf | Parent;

export function isParent(node: Node): node is Parent {
  return (node as Parent).children !== undefined;
}
