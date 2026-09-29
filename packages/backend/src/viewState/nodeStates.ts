import { AnyNodeType, NodeId } from "../contracts-ui";
import type * as Id from "../id2";

export type NodeStates = {
  isExpandedId: (id: Id.AnyBigId, isGroup: boolean) => boolean;
  isExpandedNode: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T) => boolean;
  isVisibleNode: <T extends { nodeId: NodeId; type: AnyNodeType }>(node: T, isParentVisible: boolean) => boolean;
};
