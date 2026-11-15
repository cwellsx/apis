import { isParent } from "../contracts-ui";
import { Id, IdAny } from "../id";
import type { Sql } from "../sqlDotNet";
import type { Forest } from "./forest";
import { remapCalls } from "./remapCalls";

// the calls of the graph: those between the visible leaves, and those of the nodes hidden inside a visible node,
// which are attributed to the node each one is hidden in
export const getCalls = (
  sqlTables: Sql.Tables,
  forest: Forest,
  hiddenIn: Map<Id.CallFromId, Id.CallFromId>
): Sql.Call[] => {
  const allNodes = [...forest.allNodes.values()];
  const leafIds = allNodes
    .filter((node) => !isParent(node) && node.isVisible)
    .map((node) => IdAny.toAnyBigId(node.nodeId, node.type));

  // the calls of the namespaces which are hidden inside a node are selected with the calls of the nodes, and
  // then attributed to the node each one is hidden in
  const ids = [...leafIds, ...hiddenIn.keys()] as Id.CallFromId[];
  const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], ids);
  return remapCalls(calls, hiddenIn);
};
