import type { Node as TreeNode } from "backend/shared-types";
import { isParent, nodeIdToText } from "backend/shared-types";
import * as React from "react";
import CheckboxTree, { Node as CheckboxNode } from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import "./3rd-party/CheckboxTree.css";
import "./Tree.css";
import { icons } from "./checkboxTreeIcons";

type TreeProps = {
  nodes: TreeNode[] | null;
  leafVisible: string[];
  groupExpanded: string[];
  checkModel: "all" | "leaf";
  setLeafVisible: (names: string[]) => void;
  setGroupExpanded: (names: string[]) => void;
};

// convert from GroupNode (defined in "../shared-types") to CheckboxNode (defined in "react-checkbox-tree")
const convert = (node: TreeNode): CheckboxNode => {
  return {
    label: node.label,
    // a parent node may have the same label as its first child, so mangle the id of all parents
    value: nodeIdToText(node.nodeId),
    children: isParent(node) ? node.children.sort((x, y) => x.label.localeCompare(y.label)).map(convert) : undefined,
  };
};

const getNodes = (nodes: TreeNode[] | null): CheckboxNode[] => (nodes ? nodes.map(convert) : []);

export const Tree: React.FunctionComponent<TreeProps> = (props: TreeProps) => {
  const { leafVisible, nodes, groupExpanded, checkModel } = props;

  // use these to round-trip to get a new View
  const onCheck = (value: string[]) => props.setLeafVisible(value);
  const onExpand = (value: string[]) => props.setGroupExpanded(value);

  return (
    <CheckboxTree
      checkModel={checkModel}
      nodes={getNodes(nodes)}
      checked={leafVisible}
      expanded={groupExpanded}
      onCheck={onCheck}
      onExpand={onExpand}
      icons={icons}
      showNodeIcon={false}
      id="treeid"
      showExpandAll={true}
    />
  );
};
