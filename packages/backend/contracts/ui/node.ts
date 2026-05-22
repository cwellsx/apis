import { NodeId } from "./nodeId";
import { AnyNodeType } from "./nodeTypes";

// these are nodes in the tree of checkboxes
// they show how graph nodes are grouped and control which groups are expanded
// they don't show edges and node properties and don't need more data than this
// extra data (decorators) are defined in ImageAttribute

export type Leaf = {
  label: string;
  nodeId: NodeId; // unique within graph and/or within group tree
  parent: Parent | null;
  type: AnyNodeType;
};

export type Parent = Leaf & { children: Node[] };

export type Node = Leaf | Parent;

export function isParent(node: Node): node is Parent {
  return (node as Parent).children !== undefined;
}

/*

In future redefine this as follows:

- Node has children
- Leaf has empty children
- Parent is non-empty

```
export type Node = {
  label: string;
  nodeId: NodeId;
  parent: Node | null;
  children: Node[];
};

export type Leaf = Node & { children: [] };
export type Parent = Node & { children: [Node, ...Node[]] };
```

And, include NodeState and NodeType in the Node:

```
export type NodeState = { isHidden?: boolean; isExpanded?: boolean };
export type NodeType = "g" | "a" | "n" | "t" | "m";
```

*/
