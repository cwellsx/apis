import { SqlTable } from "sqlio";
import { AnyNodeType, NodeId } from "../contracts-ui";
import * as Id from "../id2";
import { zero } from "../id2";
import { makeNodeStatesT, MakeNodeStatesT, NodeStatesT, ToT, ViewStateT } from "./nodeStatesT";
import { Boolean } from "./sqlBoolean";

export type ViewState = ViewStateT<Id.AnyBigId>;
export type CustomViewState = ViewStateT<string>;

type MakeNodeStates = MakeNodeStatesT<Id.AnyBigId>;

export type NodeStates = NodeStatesT<Id.AnyBigId>;
export type CustomNodeStates = NodeStatesT<string>;

export const makeNodeStates = (sqlTable: SqlTable<ViewState>, viewId: Id.ViewId): MakeNodeStates => {
  const toT: ToT<Id.AnyBigId> = (nodeId: NodeId, type: AnyNodeType) => Id.toAnyBigId(nodeId, type);
  return makeNodeStatesT<Id.AnyBigId>(sqlTable, viewId, toT);
};

export const zeroViewState: ViewState = {
  id: zero.anyBigId,
  viewId: zero.viewId,
  isHidden: 0 as Boolean,
  isExpanded: 0 as Boolean,
};

export const zeroCustomViewState: CustomViewState = {
  id: "foo",
  viewId: zero.viewId,
  isHidden: 0 as Boolean,
  isExpanded: 0 as Boolean,
};
