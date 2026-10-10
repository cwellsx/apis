import { SqlTable } from "sqlio";
import { AnyNodeType, NodeId, NodeType } from "../contracts-ui";
import * as Id from "../id2";
import { Boolean, fromBoolean, toBoolean } from "./sqlBoolean";
import { Visible } from "./visible";

export type NodeStateT<T extends Id.AnyBigId | string> = {
  viewId: Id.ViewId;
  id: T;
  isHidden: Boolean;
  isExpanded: Boolean;
};

export type NodeStatesT<T extends Id.AnyBigId | string> = {
  isExpandedId: (id: T, isGroup: boolean) => boolean;
  isExpandedNode: (nodeId: NodeId, type: AnyNodeType) => boolean;
  isVisibleNode: (nodeId: NodeId, type: AnyNodeType, isParentVisible: boolean) => boolean;
};

export type MakeNodeStatesT<T extends Id.AnyBigId | string> = {
  getNodeStates: () => NodeStatesT<T>;
  setAnyNodeState: (id: T, visible: Visible) => void;
  resetNodeStates: () => void;
};

export type ToT<T extends Id.AnyBigId | string> = (nodeId: NodeId, type: AnyNodeType) => T;

export const makeNodeStatesT = <T extends Id.AnyBigId | string>(
  sqlTable: SqlTable<NodeStateT<T>>,
  viewId: Id.ViewId,
  toT: ToT<T>
): MakeNodeStatesT<T> => {
  const getNodeStates = (): NodeStatesT<T> => {
    const viewStates: NodeStateT<T>[] = sqlTable.selectWhere({ viewId });

    const states = new Map<T, Visible>(
      viewStates.map((viewState) => [
        viewState.id,
        { isHidden: toBoolean(viewState.isHidden), isExpanded: toBoolean(viewState.isExpanded) },
      ])
    );

    // by default, groups are expanded and node are non-expanded
    // this method is called publicly with isGroup: false to get type names and method names
    // also called from isExpandedNode
    const isExpandedId = (id: T, isGroup: boolean): boolean => states.get(id)?.isExpanded ?? isGroup;

    const isExpandedNode = (nodeId: NodeId, type: AnyNodeType) => {
      const id: T = toT(nodeId, type);
      return isExpandedId(id, type == NodeType.Group);
    };

    const isVisibleNode = (nodeId: NodeId, type: AnyNodeType, isParentVisible: boolean) => {
      const id: T = toT(nodeId, type);
      const nodeState = states.get(id);
      return nodeState ? !nodeState.isHidden : isParentVisible;
    };

    return { isExpandedId, isExpandedNode, isVisibleNode };
  };

  const setAnyNodeState = (id: T, visible: Visible): void => {
    if (!visible.isExpanded && !visible.isHidden) {
      // TODO -- implement DELETE
      // return;
    }
    const viewState: NodeStateT<T> = {
      viewId,
      id,
      isHidden: fromBoolean(!!visible.isHidden),
      isExpanded: fromBoolean(!!visible.isExpanded),
    };
    sqlTable.upsert(viewState);
  };

  const resetNodeStates = (): void => {
    sqlTable.deleteWhere({ viewId });
  };

  return { getNodeStates, setAnyNodeState, resetNodeStates };
};
