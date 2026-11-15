import { Numeric } from "./forest";
import type { NodeId } from "../contracts-ui";
import { textToNodeId } from "../contracts-ui";

// like toNodeId in ../nodeIds but this accepts Numeric instead of AnyNodeId
export const toNodeId = <TId extends Numeric>(id: TId): NodeId => {
  const text = id.toString();
  return textToNodeId(text);
};
