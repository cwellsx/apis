import { AnyNodeType, NodeId, NodeType } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql, ViewType } from "../sql2";

export type NodeState = { isHidden: boolean; isExpanded: boolean };

const toBoolean = (b: Sql.Boolean): boolean => b == 1;
export const fromBoolean = (b: boolean): Sql.Boolean => (b ? 1 : 0);

export class NodeStates {
  private _states: Map<Id.AnyBigId, NodeState>;
  private _viewType: ViewType;

  isExpandedId: (id: Id.AnyBigId, isGroup: boolean) => boolean;
  isVisibleId: (id: Id.AnyBigId) => boolean;
  showsChildIds: (id: Id.AnyBigId, isGroup: boolean) => boolean;

  isExpandedNode: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => boolean;
  isVisibleNode: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => "visible" | "hidden";
  showsChildNodes: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => boolean;

  constructor(viewStates: Sql.ViewState[], viewType: ViewType) {
    this._states = new Map<Id.AnyBigId, NodeState>(
      viewStates.map((viewState) => [
        viewState.id,
        { isHidden: toBoolean(viewState.isHidden), isExpanded: toBoolean(viewState.isExpanded) },
      ])
    );
    this._viewType = viewType;

    // by default, groups are expanded and node are non-expanded
    this.isExpandedId = (id: Id.AnyBigId, isGroup: boolean): boolean => this._states.get(id)?.isExpanded ?? isGroup;
    // by default, groups and nodes are visible unless explicitly hidden
    this.isVisibleId = (id: Id.AnyBigId): boolean => !(this._states.get(id)?.isHidden ?? false);
    this.showsChildIds = (id: Id.AnyBigId, isGroup: boolean) => this.isExpandedId(id, isGroup) && this.isVisibleId(id);

    this.isExpandedNode = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) =>
      this.isExpandedId(toAnyBigId(node.nodeId, node.type, viewType), node.type == NodeType.Group);
    this.isVisibleNode = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) =>
      this.isVisibleId(toAnyBigId(node.nodeId, node.type, viewType)) ? "visible" : "hidden";
    this.showsChildNodes = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) =>
      this.showsChildIds(toAnyBigId(node.nodeId, node.type, viewType), node.type == NodeType.Group);
  }
}

export type HasState = (id: Id.AnyBigId) => boolean;
