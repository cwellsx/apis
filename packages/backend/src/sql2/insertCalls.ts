import { assert, getOrSet } from "../utils";
import { Call, Tables } from "./schema";

const insertFromAssembly = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .join(tables.typeNames, "id", tables.methodNames, "typeId")
    .distinct()
    .selectAll<Call>({ fromId: "typeNames.assemblyId", toId: "calls.toId" });
  tables.calls.insertMany(callsFrom);
};

const insertFromNamespace = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .join(tables.typeNames, "id", tables.methodNames, "typeId")
    .where("typeNames.namespaceId IS NOT NULL")
    .distinct()
    .selectAll<Call>({ fromId: "typeNames.namespaceId", toId: "calls.toId" });
  tables.calls.insertMany(callsFrom);
};

const assertDistinct = (calls: Call[]) => {
  const all = new Map<bigint, Set<bigint>>();
  calls.forEach((call) => {
    const set = getOrSet(all, call.fromId, () => new Set<bigint>());
    assert(!set.has(call.toId));
    set.add(call.toId);
  });
};

const insertFromTypes = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .distinct()
    .selectAll<Call>({ fromId: "methodNames.typeId", toId: "calls.toId" });
  assertDistinct(callsFrom);
  tables.calls.insertMany(callsFrom);
};

export const insertCalls = (tables: Tables): void => {
  insertFromTypes(tables);
  insertFromNamespace(tables);
  insertFromAssembly(tables);
};
