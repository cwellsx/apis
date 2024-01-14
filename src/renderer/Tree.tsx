import * as React from "react";
import CheckboxTree, { Node, Icons } from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import "./Tree.css";
import type { Node as MyNode } from "../shared-types";
import * as Icon from "./Icons";

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

const isShown = (nodes: MyNode[]): string[] => {
  const result: string[] = [];
  nodes.forEach((node) => {
    if (node.isShown) result.push(node.id ?? node.label);
    if (node.children) result.push(...isShown(node.children));
  });
  return result;
};

// initialize using SVG icons
// the ./icons folder at the root of this project shows how these SVG components were created
// if we want default icons then we would need to include FontAwsome
const icons: Icons = {
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

export const Tree: React.FunctionComponent<TreeProps> = (props: TreeProps) => {
  const [checked, setChecked] = React.useState(isShown(props.nodes));
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const nodes = props.nodes.map(convert);

  const onCheck = (value: string[]) => {
    setChecked(value);
  };
  const onExpand = (value: string[]) => {
    setExpanded(value);
  };

  return (
    <CheckboxTree
      nodes={nodes}
      checked={checked}
      expanded={expanded}
      onCheck={onCheck}
      onExpand={onExpand}
      icons={icons}
      checkModel="all"
    />
  );
};
