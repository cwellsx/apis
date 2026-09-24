import { NodeId } from "./nodeId";
import { AnyNodeType } from "./nodeTypes";

// these are nodes in the tree of checkboxes
// they show how graph nodes are grouped and control which groups are expanded
// they don't show edges and node properties and don't need more data than this
// extra data (decorators) are defined in ImageAttribute

// node types

type Common = {
  label: string;
  nodeId: NodeId; // unique within graph and/or within group tree
  parent: Parent | null;
  type: AnyNodeType;
};

export type IsShown = boolean | "mixed";

export type Leaf = Common & { collapsible: "none"; isShown: boolean };
export type Closed = Common & { collapsible: "collapsed"; isShown: IsShown };
export type Parent = Common & { collapsible: "expanded"; isShown: IsShown; children: Node[] };

export type Node = Leaf | Parent | Closed;

// node methods

export const isParent = (node: Node): node is Parent => {
  return (node as Parent).children !== undefined;
};

export const isLeaf = (node: Node): node is Leaf => {
  return node.collapsible == "none";
};

export const isClosed = (node: Node): node is Closed => {
  return node.collapsible == "collapsed";
};

export const isVisible = (node: Node): boolean => {
  return node.isShown == true;
};

// state types -- TODO rename these to isShown and isExpanded booleans

//export type Shown = Node["shown"];
export type Collapsible = Node["collapsible"];
