import { isMixed, isParent, NewNodeState, type Node, type OnFilterEvent } from "backend-ui";
import * as React from "react";
import { OnToggle, TreeView } from "./components";

type TreeProps = { nodes: Node[]; onFilterEvent: OnFilterEvent };

export const Nodes: React.FunctionComponent<TreeProps> = (props: TreeProps) => {
  const { nodes, onFilterEvent } = props;

  const onToggleExpand: OnToggle = (node) => {
    // toggle collapsible
    const isExpanded = isParent(node);
    const newState: NewNodeState = { id: node.nodeId, nodeType: node.type, nodeState: { isExpanded: !isExpanded } };
    onFilterEvent([newState]);
  };

  const onToggleCheck: OnToggle = (node) => {
    // toggle isVisible
    const isHidden = !node.isVisible || isMixed(node);
    const newState: NewNodeState = { id: node.nodeId, nodeType: node.type, nodeState: { isHidden: !isHidden } };
    onFilterEvent([newState]);
  };

  const renderNode: (node: Node) => React.ReactNode = (node) => node.label;

  return (
    <TreeView
      id={"explorer"}
      roots={nodes}
      onToggleExpand={onToggleExpand}
      onToggleCheck={onToggleCheck}
      renderNode={renderNode}
    />
  );
};
