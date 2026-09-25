import type { Node } from "backend-ui";
import { isLeaf, isParent, nodeIdToText } from "backend-ui";
import * as React from "react";
import { Codeicons } from "../images.tsx";
import { CheckBox } from "./CheckBox";
import "./TreeView.scss";

// SVG icons
const chevronRight = <Codeicons.SvgChevronRight />;
const chevronDown = <Codeicons.SvgChevronDown />;

export type OnToggle = (node: Node) => void;

type TreeItemProps = {
  node: Node;
  onToggleExpand: OnToggle;
  onToggleCheck: OnToggle | null;
  renderNode: (node: Node) => React.ReactNode;
};

const TreeItem: React.FC<TreeItemProps> = ({ node, onToggleExpand, onToggleCheck, renderNode }) => {
  const isGroup = !isLeaf(node);
  const isExpanded = isParent(node);

  const getCheckBox = (): React.ReactNode => {
    if (onToggleCheck == null) return <></>;
    const onToggle = () => onToggleCheck(node);
    return <CheckBox onToggle={onToggle} checked={node.isShown} />;
  };

  return (
    <li className="tree-item">
      <div className="tree-row">
        {isGroup ? (
          <button
            type="button"
            className="tree-expander"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-expanded={isExpanded}
            onClick={() => onToggleExpand(node)}
          >
            {isExpanded ? chevronDown : chevronRight}
          </button>
        ) : (
          <div className="tree-expander" />
        )}

        {getCheckBox()}

        <span className="tree-content">{renderNode(node)}</span>
      </div>

      {isGroup && isExpanded && (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeItem
              key={nodeIdToText(child.nodeId)}
              node={child}
              onToggleExpand={onToggleExpand}
              onToggleCheck={onToggleCheck}
              renderNode={renderNode}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

type TreeViewProps = {
  roots: Node[];
  onToggleExpand: OnToggle;
  onToggleCheck: OnToggle | null;
  renderNode: (node: Node) => React.ReactNode;
};

export const TreeView: React.FC<TreeViewProps> = ({ roots, onToggleExpand, onToggleCheck, renderNode }) => {
  return (
    <ul className="tree-root">
      {roots.map((node) => (
        <TreeItem
          key={nodeIdToText(node.nodeId)}
          node={node}
          onToggleExpand={onToggleExpand}
          onToggleCheck={onToggleCheck}
          renderNode={renderNode}
        />
      ))}
    </ul>
  );
};
