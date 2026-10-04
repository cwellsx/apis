import { SqlTable } from "sqlio";
import { AnyNodeType, NodeId } from "../contracts-ui";
import * as Id from "../id2";
import { makeNodeStatesT, MakeNodeStatesT, NodeStatesT, ToT, ViewStateT } from "./nodeStatesT";

export type ViewState = ViewStateT<Id.AnyBigId>;
export type CustomViewState = ViewStateT<string>;

type MakeNodeStates = MakeNodeStatesT<Id.AnyBigId>;

export type NodeStates = NodeStatesT<Id.AnyBigId>;
export type CustomNodeStates = NodeStatesT<string>;

export const makeNodeStates = (sqlTable: SqlTable<ViewState>, viewId: Id.ViewId): MakeNodeStates => {
  const toT: ToT<Id.AnyBigId> = (nodeId: NodeId, type: AnyNodeType) => Id.toAnyBigId(nodeId, type);
  return makeNodeStatesT<Id.AnyBigId>(sqlTable, viewId, toT);
};
