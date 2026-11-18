import { isParent, Node } from "../contracts-ui";
import { Id, IdAny } from "../id";
import type { Sql } from "../sqlDotnet";
import { getOrThrow } from "../utils";
import type { Forest } from "../viewCommon";

// A call of a namespace which is hidden inside a node is a call of that node, so an endpoint which is such a
// namespace becomes the node it is hidden in.
//
// Two of the calls can then be the same call, because they came from two namespaces hidden in the same node, and
// a call can be within one node, because both of its endpoints are hidden in it. There is no reason to draw the
// same edge twice, and a call within one node is not an edge at all -- which is also true of a call which was
// within one node before any of this, such as one method of a type calling another.
const remapCalls = (calls: Sql.Call[], hiddenIn: Map<Id.CallFromId, Id.CallFromId>): Sql.Call[] => {
  const remapped: Sql.Call[] = [];
  const seen = new Set<string>();

  for (const call of calls) {
    // the map holds the ids of namespaces and of types only, so an endpoint of any other kind finds nothing and is
    // unchanged
    const fromId = hiddenIn.get(call.fromId) ?? call.fromId;
    const toId = hiddenIn.get(call.toId as Id.CallFromId) ?? call.toId;
    if (fromId === toId) continue;

    const key = `${fromId}||${toId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    remapped.push({ fromId, toId });
  }

  return remapped;
};

// a call of the graph, with the nodes it is drawn between: an edge is a call between two nodes, and the nodes are
// what a front end needs, so they are found here rather than by each caller
export type NodeCall = Sql.Call & { fromNode: Node; toNode: Node };

// the calls of the graph: those between the visible leaves, and those of the nodes hidden inside a visible node,
// which are attributed to the node each one is hidden in
export const getCalls = (
  sqlTables: Sql.Tables,
  forest: Forest,
  hiddenIn: Map<Id.CallFromId, Id.CallFromId>
): NodeCall[] => {
  // the visible nodes with nothing visible below them, which are the endpoints of the drawn edges: a call's own
  // endpoints are these, and a hidden endpoint is attributed to the leaf it is hidden in -- a node which hides a
  // clustered namespace or type is not expanded, so it has no visible children and is itself a leaf
  const allLeafs = new Map<Id.AnyBigId, Node>();
  for (const node of forest.allNodes.values())
    if (!isParent(node) && node.isVisible) allLeafs.set(IdAny.toAnyBigId(node.nodeId, node.type), node);

  // the calls of the namespaces which are hidden inside a node are selected with the calls of the nodes, and
  // then attributed to the node each one is hidden in
  const ids = [...allLeafs.keys(), ...hiddenIn.keys()] as Id.CallFromId[];
  const calls = sqlTables.calls.selectWhereIn(["fromId", "toId"], ids);

  // the leaf nodes are found after the calls are remapped, because a remapped endpoint is the leaf its own endpoint
  // is hidden in rather than that endpoint itself
  const getLeafNode = (id: Id.CallFromId | Id.CallToId): Node => getOrThrow(allLeafs, id);
  return remapCalls(calls, hiddenIn).map((call) => ({
    ...call,
    fromNode: getLeafNode(call.fromId),
    toNode: getLeafNode(call.toId),
  }));
};
