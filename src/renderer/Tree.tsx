import * as React from "react";
import CheckboxTree, { Node } from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import "../renderer.3rd-party/CheckboxTree.css";
import type { GroupNode, Groups } from "../shared-types";
import { isParent } from "../shared-types";
import "./Tree.css";
import { icons } from "./checkboxTreeIcons";

type TreeProps = {
  nodes: Groups | null;
  leafVisible: string[];
  groupExpanded: string[];
  setLeafVisible: (names: string[]) => void;
  setGroupExpanded: (names: string[]) => void;
};

// convert from GroupNode (defined in "../shared-types") to Node (defined in "react-checkbox-tree")
const convert = (node: GroupNode): Node => {
  return {
    label: node.label,
    // a parent node may have the same label as its first child, so mangle the id of all parents
    value: node.id,
    children: isParent(node) ? node.children.map(convert) : undefined,
  };
};

const getNodes = (nodes: Groups | null): Node[] => (nodes ? nodes.map(convert) : []);

export const Tree: React.FunctionComponent<TreeProps> = (props: TreeProps) => {
  const { leafVisible, nodes, groupExpanded } = props;

  // use these to round-trip to get a new View
  const onCheck = (value: string[]) => props.setLeafVisible(value);
  const onExpand = (value: string[]) => props.setGroupExpanded(value);

  return (
    <CheckboxTree
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
