import { AnyNodeType, NodeId, NodeType } from "../contracts-ui";
import type * as Id from "../id2";
import { toAnyBigId } from "../id2";
import { Sql, ViewType } from "../sql2";
import { NodeState } from "./nodeState";
import { toBoolean } from "./sqlBoolean";

// avoid exporting this module outside of viewState
export class NodeStates {
  isExpandedId: (id: Id.AnyBigId, isGroup: boolean) => boolean;
  isExpandedNode: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => boolean;
  isVisibleNode: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T, isParentVisible: boolean) => boolean;

  constructor(viewStates: Sql.ViewState[], viewType: ViewType) {
    const states = new Map<Id.AnyBigId, NodeState>(
      viewStates.map((viewState) => [
        viewState.id,
        { isHidden: toBoolean(viewState.isHidden), isExpanded: toBoolean(viewState.isExpanded) },
      ])
    );

    // by default, groups are expanded and node are non-expanded
    // this method is called publicly with isGroup: false to get type names and method names
    // also called from isExpandedNode
    this.isExpandedId = (id: Id.AnyBigId, isGroup: boolean): boolean => states.get(id)?.isExpanded ?? isGroup;

    this.isExpandedNode = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) =>
      this.isExpandedId(toAnyBigId(node.nodeId, node.type, viewType), node.type == NodeType.Group);

    this.isVisibleNode = <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T, isParentVisible: boolean) => {
      const id: Id.AnyBigId = toAnyBigId(node.nodeId, node.type, viewType);
      const nodeState = states.get(id);
      return nodeState ? !nodeState.isHidden : isParentVisible;
    };
  }
}
