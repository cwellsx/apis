import type { AnyGroupType, AnyNodeType, NodeId, NodeState } from "../contracts-ui";
import * as Id from "../id2";
import { GetSetNodeStatesT } from "../sqlCommon";
import { ToT } from "./toT";
import type { GraphNodes } from "./types";
import { SetNodeState } from "./types";

export const makeSetNodeState = <T extends Id.AnyBigId | Id.AnyCustomId>(
  getSetNodeStates: GetSetNodeStatesT<T>,
  toT: ToT<T>, // Id.toAnyBigId or Id.toAnyCustomId
  groupType: AnyGroupType
): SetNodeState => {
  const setNodeState = (nodeId: NodeId, nodeType: AnyNodeType, nodeState: NodeState, graphNodes: GraphNodes) => {
    const id = toT(nodeId, nodeType);

    if ("isHidden" in nodeState) {
      const isVisible = !nodeState.isHidden;
      const node = graphNodes.getNode(nodeId);
      const isParentShown = node.parent?.isShown ?? true;
      getSetNodeStates.setIsVisible(id, isParentShown, isVisible);
    }

    if ("isExpanded" in nodeState) {
      const isExpanded = nodeState.isExpanded;
      const isGroup = nodeType == groupType;
      getSetNodeStates.setIsExpanded(id, isGroup, isExpanded);
    }
  };

  return setNodeState;
};
