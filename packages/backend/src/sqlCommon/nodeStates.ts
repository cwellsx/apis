import { SqlDatabase } from "sqlio";
import * as Id from "../id2";
import { zero } from "../id2";
import { Boolean, fromBoolean, toBoolean } from "./sqlBoolean";

export type NodeStatesT<T extends Id.AnyBigId | Id.AnyCustomId> = {
  isExpandedId: (id: T, isGroup: boolean) => boolean;
  isVisibleId: (id: T, isParentVisible: boolean) => boolean;
};
export type NodeStates = NodeStatesT<Id.AnyBigId>;
export type CustomNodeStates = NodeStatesT<Id.AnyCustomId>;

export type GetSetNodeStatesT<T extends Id.AnyBigId | Id.AnyCustomId> = {
  getNodeStates: () => NodeStatesT<T>;
  //setNodeState: (id: T, nodeState: NodeState) => void;
  resetNodeStates: () => void;
  setIsExpanded: (id: T, isGroup: boolean, isExpanded: boolean) => void;
  setIsVisible: (id: T, isParentVisible: boolean, isVisible: boolean) => void;
};

export type ViewNodeStates<T extends Id.AnyBigId | Id.AnyCustomId> = (viewId: Id.ViewId) => GetSetNodeStatesT<T>;

type BooleanStateT<T extends Id.AnyBigId | Id.AnyCustomId> = { viewId: Id.ViewId; id: T; isTrue: Boolean };

export const nodeStateTablesT = <T extends Id.AnyBigId | Id.AnyCustomId>(
  db: SqlDatabase,
  zeroId: T
): ViewNodeStates<T> => {
  const zeroBoolean: BooleanStateT<T> = { viewId: zero.viewId, id: zeroId, isTrue: 0 as Boolean };

  const nodeHiddenStates = db.newSqlTable("nodeHiddenStates", ["viewId", "id"], zeroBoolean);
  const nodeExpandedStates = db.newSqlTable("nodeExpandedStates", ["viewId", "id"], zeroBoolean);

  const viewNodeStates = (viewId: Id.ViewId): GetSetNodeStatesT<T> => {
    const getNodeStates = (): NodeStatesT<T> => {
      const toMap = (booleanStates: BooleanStateT<T>[]) =>
        new Map<T, boolean>(booleanStates.map((it) => [it.id, toBoolean(it.isTrue)]));

      const isHidden = toMap(nodeHiddenStates.selectWhere({ viewId }));
      const isExpanded = toMap(nodeExpandedStates.selectWhere({ viewId }));

      // by default, groups are expanded and nodes are non-expanded
      const isExpandedId = (id: T, isGroup: boolean): boolean => isExpanded.get(id) ?? isGroup;

      // be default, any is visible if parent is visible
      const isVisibleId = (id: T, isParentVisible: boolean): boolean => {
        const hidden = isHidden.get(id);
        return hidden === undefined ? isParentVisible : !hidden;
      };

      return { isExpandedId, isVisibleId };
    };

    const setIsExpanded = (id: T, isGroup: boolean, isExpanded: boolean): void => {
      if (isGroup == isExpanded) nodeExpandedStates.deleteWhere({ viewId, id });
      else nodeExpandedStates.upsert({ viewId, id, isTrue: fromBoolean(isExpanded) });
    };

    const setIsVisible = (id: T, isParentVisible: boolean, isVisible: boolean): void => {
      if (isParentVisible == isVisible) nodeHiddenStates.deleteWhere({ viewId, id });
      else nodeHiddenStates.upsert({ viewId, id, isTrue: fromBoolean(!isVisible) });
    };

    const resetNodeStates = (): void => {
      nodeHiddenStates.deleteWhere({ viewId });
      nodeExpandedStates.deleteWhere({ viewId });
    };

    return { getNodeStates, setIsExpanded, setIsVisible, resetNodeStates };
  };

  return viewNodeStates;
};

export const getNodeStatesT = <T extends Id.AnyBigId | Id.AnyCustomId>(
  isHidden: Map<T, boolean>,
  isExpanded: Map<T, boolean>
): NodeStatesT<T> => {
  // by default, groups are expanded and nodes are non-expanded
  const isExpandedId = (id: T, isGroup: boolean): boolean => isExpanded.get(id) ?? isGroup;

  // be default, any is visible if parent is visible
  const isVisibleId = (id: T, isParentVisible: boolean): boolean => {
    const hidden = isHidden.get(id);
    return hidden === undefined ? isParentVisible : !hidden;
  };

  return { isExpandedId, isVisibleId };
};
