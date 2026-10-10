import { SqlTable } from "sqlio";
import { AnyNodeType, NodeId } from "../contracts-ui";
import * as Id from "../id2";
import { zero } from "../id2";
import { makeNodeStatesT, MakeNodeStatesT, NodeStatesT, NodeStateT, ToT } from "./nodeStatesT";
import { Boolean } from "./sqlBoolean";

export type NodeState = NodeStateT<Id.AnyBigId>;
export type CustomNodeState = NodeStateT<string>;

type MakeNodeStates = MakeNodeStatesT<Id.AnyBigId>;

export type NodeStates = NodeStatesT<Id.AnyBigId>;
export type CustomNodeStates = NodeStatesT<string>;

export const makeNodeStates = (sqlTable: SqlTable<NodeState>, viewId: Id.ViewId): MakeNodeStates => {
  const toT: ToT<Id.AnyBigId> = (nodeId: NodeId, type: AnyNodeType) => Id.toAnyBigId(nodeId, type);
  return makeNodeStatesT<Id.AnyBigId>(sqlTable, viewId, toT);
};

export const zeroNodeState: NodeState = {
  id: zero.anyBigId,
  viewId: zero.viewId,
  isHidden: 0 as Boolean,
  isExpanded: 0 as Boolean,
};

export const zeroCustomNodeState: CustomNodeState = {
  id: "foo",
  viewId: zero.viewId,
  isHidden: 0 as Boolean,
  isExpanded: 0 as Boolean,
};
