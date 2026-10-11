import { SqlTable } from "sqlio";
import { AnyNodeType, NodeId, NodeType } from "../contracts-ui";
import * as Id from "../id2";
import { zero } from "../id2";
import { makeNodeStatesT, MakeNodeStatesT, NodeStatesT, NodeStateT, ToT } from "./nodeStatesT";
import { Boolean } from "./sqlBoolean";

export type NodeState = NodeStateT<Id.AnyBigId>;
export type CustomNodeState = NodeStateT<Id.AnyCustomId>;

export type NodeStates = NodeStatesT<Id.AnyBigId>;
export type CustomNodeStates = NodeStatesT<Id.AnyCustomId>;

export const makeNodeStates = (sqlTable: SqlTable<NodeState>, viewId: Id.ViewId): MakeNodeStatesT<Id.AnyBigId> => {
  const toT: ToT<Id.AnyBigId> = (nodeId: NodeId, type: AnyNodeType) => Id.toAnyBigId(nodeId, type);
  return makeNodeStatesT<Id.AnyBigId>(sqlTable, viewId, toT, NodeType.Group);
};
export const makeCustomNodeStates = (
  sqlTable: SqlTable<CustomNodeState>,
  viewId: Id.ViewId
): MakeNodeStatesT<Id.AnyCustomId> => {
  const toT: ToT<Id.AnyCustomId> = (nodeId: NodeId, type: AnyNodeType) => Id.toAnyCustomId(nodeId, type);
  return makeNodeStatesT<Id.AnyCustomId>(sqlTable, viewId, toT, NodeType.CustomGroup);
};

export const zeroNodeState: NodeState = {
  id: zero.anyBigId,
  viewId: zero.viewId,
  isHidden: 0 as Boolean,
  isExpanded: 0 as Boolean,
};

export const zeroCustomNodeState: CustomNodeState = {
  id: zero.customId,
  viewId: zero.viewId,
  isHidden: 0 as Boolean,
  isExpanded: 0 as Boolean,
};
