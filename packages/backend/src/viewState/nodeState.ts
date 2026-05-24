import type { AnyNodeType, NodeId } from "../contracts-ui";
import { NodeType } from "../contracts-ui";

export type NodeState = { isHidden?: boolean; isExpanded?: boolean };
export type GetNodeState = (nodeId: NodeId) => NodeState;

const isExpandedByDefault = (nodeType: AnyNodeType): boolean => nodeType === NodeType.Group;

export const getIsExpanded = (nodeState: NodeState, nodeType: AnyNodeType): boolean =>
  isExpandedByDefault(nodeType) ? nodeState.isExpanded !== false : nodeState.isExpanded === true;
