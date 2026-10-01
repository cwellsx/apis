import { AnyNodeType, NodeId, NodeType } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql, ViewType } from "../sql2";
import { assert } from "../utils";
import { NodeState } from "./nodeState";
import type { NodeStates } from "./nodeStates";
import { fromBoolean, toBoolean } from "./sqlBoolean";

// avoid exporting this module outside of viewState
export type MakeNodeStates = {
  getNodeStates: () => NodeStates;
  setAnyNodeState: (id: Id.AnyBigId, nodeState: NodeState) => void;
  resetNodeStates: () => void;
};

export const databaseNodeStates = (sqlTables: Sql.Tables, viewType: ViewType): MakeNodeStates => {
  const views = sqlTables.views.selectAll();
  const found = views.find((view) => view.viewType == viewType);
  assert(!!found);
  const viewId: Id.ViewId = found.id;

  const getNodeStates = (): NodeStates => {
    const viewStates: Sql.ViewState[] = sqlTables.viewStates.selectWhere({ viewId });

    const states = new Map<Id.AnyBigId, NodeState>(
      viewStates.map((viewState) => [
        viewState.id,
        { isHidden: toBoolean(viewState.isHidden), isExpanded: toBoolean(viewState.isExpanded) },
      ])
    );

    // by default, groups are expanded and node are non-expanded
    // this method is called publicly with isGroup: false to get type names and method names
    // also called from isExpandedNode
    const isExpandedId = (id: Id.AnyBigId, isGroup: boolean): boolean => states.get(id)?.isExpanded ?? isGroup;

    const isExpandedNode = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) =>
      isExpandedId(toAnyBigId(node.nodeId, node.type), node.type == NodeType.Group);

    const isVisibleNode = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T, isParentVisible: boolean) => {
      const id: Id.AnyBigId = toAnyBigId(node.nodeId, node.type);
      const nodeState = states.get(id);
      return nodeState ? !nodeState.isHidden : isParentVisible;
    };

    return { isExpandedId, isExpandedNode, isVisibleNode };
  };

  const setAnyNodeState = (id: Id.AnyBigId, nodeState: NodeState): void => {
    if (!nodeState.isExpanded && !nodeState.isHidden) {
      // TODO -- implement DELETE
      // return;
    }
    const viewState: Sql.ViewState = {
      viewId,
      id,
      isHidden: fromBoolean(!!nodeState.isHidden),
      isExpanded: fromBoolean(!!nodeState.isExpanded),
    };
    sqlTables.viewStates.upsert(viewState);
  };

  const resetNodeStates = (): void => {
    sqlTables.viewStates.deleteWhere({ viewId });
  };

  return { getNodeStates, setAnyNodeState, resetNodeStates };
};
