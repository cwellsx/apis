import type { Node } from "backend-ui";
import * as React from "react";
import { TreeView } from "./TreeView";

type TreeProps = {
  nodes: Node[];
  leafVisible: string[];
  groupExpanded: string[];
  checkModel: "all" | "leaf";
  setLeafVisible: (names: string[]) => void;
  setGroupExpanded: (names: string[]) => void;
};

function remove<T>(items: T[], item: T) {
  const index = items.indexOf(item);
  items.splice(index, 1);
}

export const Nodes: React.FunctionComponent<TreeProps> = (props: TreeProps) => {
  const { leafVisible, nodes, groupExpanded, checkModel } = props;

  const onToggleExpand: (id: string) => void = (id) => {
    if (groupExpanded.includes(id)) remove(groupExpanded, id);
    else groupExpanded.push(id);
    props.setGroupExpanded(groupExpanded);
  };

  const onToggleCheck: (id: string) => void = (id) => {
    if (leafVisible.includes(id)) remove(leafVisible, id);
    else leafVisible.push(id);
    props.setLeafVisible(groupExpanded);
  };

  const renderNode: (node: Node) => React.ReactNode = (node) => node.label;

  return (
    <TreeView roots={nodes} onToggleExpand={onToggleExpand} onToggleCheck={onToggleCheck} renderNode={renderNode} />
  );
};
