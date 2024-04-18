import * as React from "react";
import { Icons } from "react-checkbox-tree";
import * as Icon from "./Icons";

// initialize using SVG icons
// the ./icons folder at the root of this project shows how these SVG components were created
// if we want default icons then we would need to include FontAwsome
export const icons: Icons = {
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
