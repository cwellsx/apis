// these are nodes in the tree of checkboxes
// they show how graph nodes are grouped and control which groups are expanded
// they don't show edges and node properties and don't need more data than this

export type TextNode = {
  label: string;
  id: string; // unique within graph and/or within group tree
};

export type LeafNode = TextNode & {
  isShown: boolean;
};

export type ParentNode = TextNode & {
  children: Groups;
};

export type GroupNode = LeafNode | ParentNode;

export type Groups = GroupNode[];

export function isLeaf(node: GroupNode): node is LeafNode {
  return (node as LeafNode).isShown !== undefined;
}
