import * as React from "react";
import CheckboxTree, { Node, Icons } from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import "./Tree.css";
import type { AnyNode, Nodes } from "../shared-types";
import { isLeaf } from "../shared-types";
import * as Icon from "./Icons";
import { log } from "./log";

type TreeProps = {
  nodes: Nodes;
  setShown: (names: string[]) => void;
};

// convert from AnyNode (defined in "../shared-types") to Node (defined in "react-checkbox-tree")
const convert = (node: AnyNode): Node => {
  return {
    label: node.label,
    // a parent node may have the same label as its first child, so mangle the id of all parents
    value: (isLeaf(node) ? "" : "!") + (node.id ?? node.label),
    children: isLeaf(node) ? undefined : node.children.map(convert),
  };
};

const isShown = (nodes: Nodes): string[] => {
  const result: string[] = [];
  nodes.forEach((node) => {
    if (isLeaf(node)) {
      if (node.isShown) result.push(node.id ?? node.label);
    } else result.push(...isShown(node.children));
  });
  return result;
};

const getChecked = (nodes: Nodes): string[] => {
  const result = isShown(nodes);
  log("getChecked", result);
  return result;
};

const getNodes = (nodes: Nodes): Node[] => {
  const result = nodes.map(convert);
  log("getNodes", result);
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
  const [checked, setChecked] = React.useState(getChecked(props.nodes));
  const [nodes, setNodes] = React.useState(getNodes(props.nodes));
  const [expanded, setExpanded] = React.useState<string[]>([]);

  React.useEffect(() => {
    log("useEffect");
    setChecked(getChecked(props.nodes));
    setNodes(getNodes(props.nodes));
  }, [props.nodes]);

  const onCheck = (value: string[]) => {
    log("onCheck", value);
    //setChecked(value); // use this to edit the checked state locally
    props.setShown(value); // use this to round-trip to get a new View
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
      showNodeIcon={false}
    />
  );
};
