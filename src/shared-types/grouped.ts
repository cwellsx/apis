// these are nodes in the tree of checkboxes
// they show how graph nodes are grouped and control which groups are expanded
// they don't show edges and node properties and don't need more data than this

type TextNode = {
  label: string;
  id: string; // unique within graph and/or within group tree
  parent: ParentNode | null;
};

export type LeafNode = TextNode;

export type ParentNode = TextNode & {
  children: Groups;
};

export type GroupNode = LeafNode | ParentNode;

export type Groups = GroupNode[];

export function isParent(node: GroupNode): node is ParentNode {
  return (node as ParentNode).children !== undefined;
}
