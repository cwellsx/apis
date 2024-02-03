import * as React from "react";
import CheckboxTree, { Icons, Node } from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import type { GroupNode, Groups } from "../shared-types";
import { isParent } from "../shared-types";
import * as Icon from "./Icons";
import "./Tree.css";
import { log } from "./log";

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
  const [checked, setChecked] = React.useState(props.leafVisible);
  const [nodes, setNodes] = React.useState(getNodes(props.nodes));
  const [expanded, setExpanded] = React.useState<string[]>(props.groupExpanded);

  React.useEffect(() => {
    log("useEffect");
    setChecked(props.leafVisible);
    setExpanded(props.groupExpanded);
    if (props.nodes) setNodes(getNodes(props.nodes));
  }, [props.nodes, props.leafVisible, props.groupExpanded]);

  const onCheck = (value: string[]) => {
    props.setLeafVisible(value); // use this to round-trip to get a new View
  };
  const onExpand = (value: string[]) => {
    props.setGroupExpanded(value); // use this to round-trip to get a new View
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
      id="treeid"
    />
  );
};
