import { NodeId } from "./nodeId";
import { AnyNodeType } from "./nodeTypes";

export type Label = { label: string; nodeId: NodeId };
export type LabelWithType = Label & { type: AnyNodeType };

export type EdgeT<T> = { clientLabel: T; serverLabel: T };

export type EdgePopup = Map<string, EdgeT<Label>[]>;
