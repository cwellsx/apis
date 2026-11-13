import { Id } from "../id2";
import type { Sql } from "../sql2";

// A call of a namespace which is hidden inside a node is a call of that node, so an endpoint which is such a
// namespace becomes the node it is hidden in.
//
// Two of the calls can then be the same call, because they came from two namespaces hidden in the same node, and
// a call can be within one node, because both of its endpoints are hidden in it. There is no reason to draw the
// same edge twice, and a call within one node is not an edge at all -- which is also true of a call which was
// within one node before any of this, such as one method of a type calling another.
export const remapCalls = (calls: Sql.Call[], hiddenIn: Map<Id.NamespaceId, Id.NamespaceId>): Sql.Call[] => {
  const remapped: Sql.Call[] = [];
  const seen = new Set<string>();

  for (const call of calls) {
    // the map holds namespace ids only, so an endpoint of any other kind finds nothing and is unchanged
    const fromId = hiddenIn.get(call.fromId as Id.NamespaceId) ?? call.fromId;
    const toId = hiddenIn.get(call.toId as Id.NamespaceId) ?? call.toId;
    if (fromId === toId) continue;

    const key = `${fromId}||${toId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    remapped.push({ fromId, toId });
  }

  return remapped;
};
