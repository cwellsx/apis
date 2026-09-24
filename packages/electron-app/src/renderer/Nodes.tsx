import { Collapsible, isParent, isVisible, NewNodeState, type Node, type OnFilterEvent } from "backend-ui";
import * as React from "react";
import { OnToggle, TreeView } from "./TreeView";

type TreeProps = { nodes: Node[]; checkModel: "all" | "leaf"; onFilterEvent: OnFilterEvent };

export const Nodes: React.FunctionComponent<TreeProps> = (props: TreeProps) => {
  const { nodes, onFilterEvent } = props;

  const onToggleExpand: OnToggle = (node) => {
    // toggle collapsible
    const isExpanded = isParent(node);
    const collapsible: Collapsible = isExpanded ? "collapsed" : "expanded";

    const newState: NewNodeState = { id: node.nodeId, nodeType: node.type, isShown: isVisible(node), collapsible };
    onFilterEvent([newState]);
  };

  const onToggleCheck: OnToggle = (node) => {
    // toggle isShown
    const newState: NewNodeState = {
      id: node.nodeId,
      nodeType: node.type,
      isShown: !node.isShown,
      collapsible: node.collapsible,
    };
    onFilterEvent([newState]);
  };

  const renderNode: (node: Node) => React.ReactNode = (node) => node.label;

  return (
    <TreeView roots={nodes} onToggleExpand={onToggleExpand} onToggleCheck={onToggleCheck} renderNode={renderNode} />
  );
};
