// these are nodes in the tree of checkboxes
// they show how graph nodes are grouped and control which groups are expanded
// they don't show edges and node properties and don't need more data than this

export type TextNode = {
  label: string;
  id?: string; // initialize this if the label isn't unique within the View, to identify the Node
};

export type LeafNode = TextNode & {
  isShown: boolean;
};

export type ParentNode = TextNode & {
  children: Nodes;
};

export type AnyNode = LeafNode | ParentNode;

export type Nodes = AnyNode[];

export function isLeaf(node: AnyNode): node is LeafNode {
  return (node as LeafNode).isShown !== undefined;
}
