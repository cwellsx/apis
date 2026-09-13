import type { Node } from "backend-ui";
import { isLeaf, isParent, nodeIdToText } from "backend-ui";
import * as React from "react";
import * as Icon from "./Icons";
import "./TreeView.scss";

// initialize using SVG icons
// the ./icons folder at the root of this project shows how these SVG components were created
// if we want default icons then we would need to include FontAwsome
const icons = {
  check: <Icon.SvgCheckBox />,
  uncheck: <Icon.SvgCheckBoxOutlineBlank />,
  halfCheck: <Icon.SvgIndeterminateCheckBox />,
  expandClose: <Icon.SvgChevronRight />,
  expandOpen: <Icon.SvgExpandMore />,
  expandAll: <Icon.SvgAddBox />,
  collapseAll: <Icon.SvgRemove />,
  parentClose: <Icon.SvgFolder />,
  parentOpen: <Icon.SvgFolderOpen />,
  leaf: <Icon.SvgNote />,
};

type TreeItemProps = { node: Node; onToggle: (id: string) => void; renderNode: (node: Node) => React.ReactNode };

const TreeItem: React.FC<TreeItemProps> = ({ node, onToggle, renderNode }) => {
  const id = nodeIdToText(node.nodeId);

  const isGroup = !isLeaf(node);
  const isExpanded = isParent(node);

  return (
    <li className="tree-item">
      <div className="tree-row">
        {isGroup && (
          <button
            type="button"
            className="tree-expander"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            aria-expanded={isExpanded}
            onClick={() => onToggle(id)}
          >
            {isExpanded ? icons.expandOpen : icons.expandClose}
          </button>
        )}

        <span className="tree-content">{renderNode(node)}</span>
      </div>

      {isGroup && isExpanded && (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeItem key={nodeIdToText(child.nodeId)} node={child} onToggle={onToggle} renderNode={renderNode} />
          ))}
        </ul>
      )}
    </li>
  );
};

type TreeViewProps = { roots: Node[]; onToggle: (id: string) => void; renderNode: (node: Node) => React.ReactNode };

export const TreeView: React.FC<TreeViewProps> = ({ roots, onToggle, renderNode }) => {
  return (
    <ul className="tree-root">
      {roots.map((node) => (
        <TreeItem key={nodeIdToText(node.nodeId)} node={node} onToggle={onToggle} renderNode={renderNode} />
      ))}
    </ul>
  );
};
