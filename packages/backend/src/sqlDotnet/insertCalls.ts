import { IdTest } from "../id";
import { assert, getOrSet, log } from "../utils";
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

// A call to a generic method targets a method spec rather than a method definition. The spec resolves to the
// definition, and every roll-up pass below needs a definition to roll up: without a row at method level, a spec's
// call has a row at type level but none below it, so the layer below such a call is empty. The spec rows are kept
// as well, since they are what the dataset had and a call stack would need them.
const insertResolvedSpecs = (tables: Tables) => {
  // the calls a spec resolves to may already be there, and the table is keyed by the pair
  const seen = new Set<string>();
  tables.calls.selectAll().forEach((call) => seen.add(`${call.fromId}-${call.toId}`));

  const resolved = tables.calls
    .join(tables.methodSpecs, "id", "toId")
    .distinct()
    .selectAll<Call>({ fromId: "calls.fromId", toId: "methodSpecs.resolvedId" })
    .filter((call) => !seen.has(`${call.fromId}-${call.toId}`));

  logCount("insertResolvedSpecs", resolved.length);
  tables.calls.insertMany(resolved);
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

const insertFromAssembly = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.methodNames, "id", "fromId")
    .join(tables.typeNames, "id", tables.methodNames, "typeId")
    .distinct()
    .selectAll<Call>({ fromId: "typeNames.assemblyId", toId: "calls.toId" });
  logCount("insertFromAssembly", callsFrom.length);
  tables.calls.insertMany(callsFrom);
};

const insertToTypes = (tables: Tables) => {
  // called method definitions are contained in a type definition
  const callsToMethodNames = tables.calls
    .join(tables.methodNames, "id", "toId")
    .distinct()
    .selectAll<Call>({ fromId: "calls.fromId", toId: "methodNames.typeId" });

  logCount("callsToMethodNames", callsToMethodNames.length);
  assert(callsToMethodNames.map((value) => value.toId).every((id) => IdTest.isTypeDefId(id)));

  // called method references have a resolved method definition which is contained in a type definition
  const callsToMethodReferences = tables.calls
    .join(tables.methodSpecs, "id", "toId")
    .join(tables.methodNames, "id", tables.methodSpecs, "resolvedId")
    .distinct()
    .selectAll<Call>({ fromId: "calls.fromId", toId: "methodNames.typeId" });

  logCount("callsToMethodReferences", callsToMethodReferences.length);
  assert(callsToMethodReferences.map((value) => value.toId).every((id) => IdTest.isTypeDefId(id)));

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
  assert(callsToGenericSignatures.map((value) => value.toId).every((id) => IdTest.isTypeDefId(id)));

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
    assert(moreCalls.map((value) => value.toId).every((id) => IdTest.isTypeDefId(id)));

    callsToGenericSignatures.push(...moreCalls);
  }

  const callsTo: Call[] = callsToMethodNames.concat(callsToMethodReferences).concat(callsToGenericSignatures);

  // deduplicate
  const seen = new Set<string>();
  const found = callsTo.filter((item) => {
    const key = `${item.fromId}-${item.toId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  tables.calls.insertMany(found);
};

const insertToNamespace = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.typeNames, "id", "toId")
    .where("typeNames.namespaceId IS NOT NULL")
    .distinct()
    .selectAll<Call>({ fromId: "calls.fromId", toId: "typeNames.namespaceId" });
  logCount("insertToNamespace", callsFrom.length);
  tables.calls.insertMany(callsFrom);
};

const insertToAssembly = (tables: Tables) => {
  const callsFrom = tables.calls
    .join(tables.typeNames, "id", "toId")
    .distinct()
    .selectAll<Call>({ fromId: "calls.fromId", toId: "typeNames.assemblyId" });
  logCount("insertToAssembly", callsFrom.length);
  tables.calls.insertMany(callsFrom);
};

export const insertCalls = (tables: Tables): void => {
  // before the roll-up passes, so that what they roll up is a method definition rather than a spec
  insertResolvedSpecs(tables);

  insertFromTypes(tables);
  insertFromNamespace(tables);
  insertFromAssembly(tables);

  const signatureTypes = tables.signatureTypes.selectAll().map((value) => value.ownerId);
  logCount("allSignatureTypes", signatureTypes.length);
  logCount("methodDefs", signatureTypes.filter(IdTest.isMethodDefId).length);
  logCount("methodRefs", signatureTypes.filter(IdTest.isMethodSpecId).length);
  logCount("typeRefs", signatureTypes.filter(IdTest.isOwnerTypeSpecId).length);

  insertToTypes(tables);
  insertToNamespace(tables);
  insertToAssembly(tables);
};
