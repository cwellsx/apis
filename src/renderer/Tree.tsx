import * as React from "react";
import CheckboxTree, { Node } from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import type { Node as MyNode } from "../shared-types";

type TreeProps = {
  nodes: MyNode[];
};

// convert from MyNode (defined in "../shared-types") to Node (defined in "react-checkbox-tree")
const convert = (node: MyNode): Node => {
  return {
    label: node.label,
    value: node.id ?? node.label,
    children: !node.children ? undefined : node.children.map(convert),
  };
};

export const Tree: React.FunctionComponent<TreeProps> = (props: TreeProps) => {
  const nodes = props.nodes.map(convert);

  // if we want default icons then we would need to include FontAwsome
  return <CheckboxTree nodes={nodes} showNodeIcon={false} />;
};
