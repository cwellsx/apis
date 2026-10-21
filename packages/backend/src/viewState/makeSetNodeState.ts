import type { AnyGroupType, AnyNodeType, NodeId, NodeState } from "../contracts-ui";
import * as Id from "../id2";
import { GetSetNodeStatesT } from "../sqlCommon";
import { Numeric, RootItem } from "./forest";
import { toNodeId } from "./toNodeId";
import { ToT } from "./toT";
import type { GraphNodes } from "./types";
import { SetNodeState } from "./types";

type RootDefault = { isVisible: boolean; isExpanded: boolean };

export const makeRootDefaults = <T extends Id.AnyBigId | Id.AnyCustomId, TId extends Numeric>(
  toT: ToT<T>, // Id.toAnyBigId or Id.toAnyCustomId
  roots: RootItem<TId>[]
): Map<T, RootDefault> =>
  new Map<T, RootDefault>(
    roots.map((root) => [
      toT(toNodeId(root.item.id), root.type),
      { isVisible: root.isVisible, isExpanded: root.isExpanded },
    ])
  );

export const makeSetNodeState = <T extends Id.AnyBigId | Id.AnyCustomId>(
  getSetNodeStates: GetSetNodeStatesT<T>,
  toT: ToT<T>, // Id.toAnyBigId or Id.toAnyCustomId
  groupType: AnyGroupType,
  rootDefaults?: Map<T, RootDefault>
): SetNodeState => {
  const setNodeState = (nodeId: NodeId, nodeType: AnyNodeType, nodeState: NodeState, graphNodes: GraphNodes) => {
    const id = toT(nodeId, nodeType);

    const rootDefault: RootDefault | undefined = rootDefaults?.get(id);

    if ("isHidden" in nodeState) {
      const isVisible = !nodeState.isHidden;
      const node = graphNodes.getNode(nodeId);
      const isParentVisible = rootDefault?.isVisible ?? node.parent?.isVisible ?? true;
      getSetNodeStates.setIsVisible(id, isParentVisible, isVisible);
    }

    if ("isExpanded" in nodeState) {
      const isExpanded = nodeState.isExpanded;
      const isGroup = rootDefault?.isExpanded ?? nodeType == groupType;
      getSetNodeStates.setIsExpanded(id, isGroup, isExpanded);
    }
  };

  return setNodeState;
};
