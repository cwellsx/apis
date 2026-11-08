import type { AnyNodeType, NodeId } from "../contracts-ui";
import { Id } from "../id2";

export type ToT<T extends Id.AnyBigId | Id.AnyCustomId> = (nodeId: NodeId, type: AnyNodeType) => T;
