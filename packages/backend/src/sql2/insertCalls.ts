import { assert, getOrSet, log } from "../utils";
import { isMethodDefId, isMethodSpecId, isOwnerTypeSpecId, isTypeDefId } from "./idTest";
import { Call, Tables } from "./schema";

const assertDistinct = (calls: Call[]) => {
  const all = new Map<bigint, Set<bigint>>();
  calls.forEach((call) => {
    const set = getOrSet(all, call.fromId, () => new Set<bigint>());
    assert(!set.has(call.toId));
    set.add(call.toId);
  });
};

const logCount = (methodName: string, count: number) => log(`${methodName}: ${count} records`);

const insertFromAssembly = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .join(tables.typeNames, "id", tables.methodNames, "typeId")
    .distinct()
    .selectAll<Call>({ fromId: "typeNames.assemblyId", toId: "calls.toId" });
  logCount("insertFromAssembly", callsFrom.length);
  tables.calls.insertMany(callsFrom);
};

const insertFromNamespace = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .join(tables.typeNames, "id", tables.methodNames, "typeId")
    .where("typeNames.namespaceId IS NOT NULL")
    .distinct()
    .selectAll<Call>({ fromId: "typeNames.namespaceId", toId: "calls.toId" });
  logCount("insertFromNamespace", callsFrom.length);
  tables.calls.insertMany(callsFrom);
};

const insertFromTypes = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .distinct()
    .selectAll<Call>({ fromId: "methodNames.typeId", toId: "calls.toId" });

  // if safeIntegers isn't enabled in the JoinQuery then precision is lost so IDs are duplicated
  assertDistinct(callsFrom);

  logCount("insertFromTypes", callsFrom.length);
  tables.calls.insertMany(callsFrom);
};

const insertToTypes = (tables: Tables) => {
  // called method definitions are contained in a type definition
  const callsToMethodNames = tables.calls
    .join(tables.methodNames, "id", "toId")
    .distinct()
    .selectAll<Call>({ fromId: "calls.fromId", toId: "methodNames.typeId" });

  logCount("callsToMethodNames", callsToMethodNames.length);
  assert(callsToMethodNames.map((value) => value.toId).every((id) => isTypeDefId(id)));

  // called method references have a resolved method definition which is contained in a type definition
  const callsToMethodReferences = tables.calls
    .join(tables.methodSpecs, "id", "toId")
    .join(tables.methodNames, "id", tables.methodSpecs, "resolvedId")
    .distinct()
    .selectAll<Call>({ fromId: "calls.fromId", toId: "methodNames.typeId" });

  logCount("callsToMethodReferences", callsToMethodReferences.length);
  assert(callsToMethodReferences.map((value) => value.toId).every((id) => isTypeDefId(id)));

  // called method references have generic type arguments in the signatures table
  let joinQuery = tables.calls
    .join(tables.methodSpecs, "id", "toId")
    .join(tables.signatureTypes, "ownerId", tables.methodSpecs, "id")
    .distinct();

  // these are all the argumentId which join to typeNames and are therefore type definitions and not nested type references
  const callsToGenericSignatures = joinQuery
    .join(tables.typeNames, "id", tables.signatureTypes, "argumentId")
    .selectAll<Call>({ fromId: "calls.fromId", toId: "typeNames.id" });

  logCount("callsToGenericSignatures", callsToGenericSignatures.length);
  assert(callsToGenericSignatures.map((value) => value.toId).every((id) => isTypeDefId(id)));

  for (let i = 0; ; ++i) {
    const leftAlias = i == 0 ? undefined : `SIG_${i - 1}`;
    const rightAlias = `SIG_${i}`;
    joinQuery = joinQuery.join(tables.signatureTypes, "ownerId", tables.signatureTypes, "argumentId", {
      leftAlias,
      rightAlias,
    });

    const moreCalls = joinQuery
      .join(tables.typeNames, "id", tables.signatureTypes, "argumentId", { leftAlias: rightAlias })
      .selectAll<Call>({ fromId: "calls.fromId", toId: "typeNames.id" });

    if (!moreCalls.length) break;

    logCount(rightAlias, moreCalls.length);
    assert(moreCalls.map((value) => value.toId).every((id) => isTypeDefId(id)));

    callsToGenericSignatures.push(...moreCalls);
  }

  const callsTo: Call[] = callsToMethodNames.concat(callsToMethodReferences).concat(callsToGenericSignatures);
};

const insertToAssembly = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.typeNames, "id", "toId")
    .distinct()
    .selectAll<Call>({ fromId: "calls.toId", toId: "typeNames.assemblyId" });
  logCount("insertToAssembly", callsFrom.length);
  tables.calls.insertMany(callsFrom);
};

export const insertCalls = (tables: Tables): void => {
  insertFromTypes(tables);
  insertFromNamespace(tables);
  insertFromAssembly(tables);

  const signatureTypes = tables.signatureTypes.selectAll().map((value) => value.ownerId);
  logCount("allSignatureTypes", signatureTypes.length);
  logCount("methodDefs", signatureTypes.filter(isMethodDefId).length);
  logCount("methodRefs", signatureTypes.filter(isMethodSpecId).length);
  logCount("typeRefs", signatureTypes.filter(isOwnerTypeSpecId).length);

  insertToTypes(tables);
  insertToAssembly(tables);
};
