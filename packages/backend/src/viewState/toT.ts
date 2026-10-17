import type { AnyNodeType, NodeId } from "../contracts-ui";
import * as Id from "../id2";

export type ToT<T extends Id.AnyBigId | Id.AnyCustomId> = (nodeId: NodeId, type: AnyNodeType) => T;
