import { AnyNodeType, NodeId, NodeType } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql, ViewType } from "../sql2";

export type NodeState = { isHidden: boolean; isExpanded: boolean };

const toBoolean = (b: Sql.Boolean): boolean => b == 1;
export const fromBoolean = (b: boolean): Sql.Boolean => (b ? 1 : 0);

export class NodeStates {
  isExpandedId: (id: Id.AnyBigId, isGroup: boolean) => boolean;
  showsChildIds: (id: Id.AnyBigId, isGroup: boolean) => boolean;

  isExpandedNode: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => boolean;
  isVisibleNode: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => "visible" | "hidden";
  showsChildNodes: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => boolean;

  constructor(viewStates: Sql.ViewState[], viewType: ViewType) {
    const states = new Map<Id.AnyBigId, NodeState>(
      viewStates.map((viewState) => [
        viewState.id,
        { isHidden: toBoolean(viewState.isHidden), isExpanded: toBoolean(viewState.isExpanded) },
      ])
    );

    // by default, groups are expanded and node are non-expanded
    this.isExpandedId = (id: Id.AnyBigId, isGroup: boolean): boolean => states.get(id)?.isExpanded ?? isGroup;
    // by default, groups and nodes are visible unless explicitly hidden
    this.showsChildIds = (id: Id.AnyBigId, isGroup: boolean) => this.isExpandedId(id, isGroup);

    this.isExpandedNode = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) =>
      this.isExpandedId(toAnyBigId(node.nodeId, node.type, viewType), node.type == NodeType.Group);

    this.isVisibleNode = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => {
      const id: Id.AnyBigId = toAnyBigId(node.nodeId, node.type, viewType);
      const isVisibleId: boolean = !(states.get(id)?.isHidden ?? false);
      return isVisibleId ? "visible" : "hidden";
    };

    this.showsChildNodes = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) =>
      this.showsChildIds(toAnyBigId(node.nodeId, node.type, viewType), node.type == NodeType.Group);
  }
}

export type HasState = (id: Id.AnyBigId) => boolean;
