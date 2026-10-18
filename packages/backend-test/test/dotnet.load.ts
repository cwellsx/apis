import { assert, log } from "backend-api";
import * as Id from "sut/id2";
import { Sql } from "sut/sql2";
import { createDotNetTables } from "./utils/createDotNetTables";
import { fileViewState } from "./utils/paths";
import {
  listCallSizes,
  printCallFromAssemblies,
  printCallFromMethods,
  printCallFromNamespaces,
  printCallFromTypes,
} from "./utils/printCalls";
import { printTestLines } from "./utils/printTestLines";

const printLines = (filename: string, printed: string[]) => printTestLines(fileViewState, filename, printed);

const printTypeRefs = (tables: Sql.Tables): void => {
  type NamedOwner = { ownerId: Id.AnyOwnerId; fullName: string };
  const namedOwners = tables.signatureTypes
    .join(tables.fullNames, "id", "ownerId")
    .selectAll<NamedOwner>({ ownerId: "signatureTypes.ownerId", fullName: "fullNames.fullName" });

  const printNamedOwners = (name: string, predicate: (id: Id.AnyOwnerId) => boolean) =>
    printLines(
      `fullnames.${name}.txt`,
      namedOwners
        .filter((value) => predicate(value.ownerId))
        .map((value) => value.fullName)
        .sort()
    );

  printNamedOwners("typeSpec", Id.isOwnerTypeSpecId);
  printNamedOwners("methodSpec", Id.isOwnerMethodSpecId);
  printNamedOwners("methodDef", Id.isOwnerMethodDefId);
};

const assertCalls = (tables: Sql.Tables): void => {
  const assembly = tables.assemblies.selectOne({ name: "Core" });
  assert(!!assembly);
  const typeName = tables.typeNames.selectOne({ assemblyId: assembly.id, name: "App" });
  assert(!!typeName);
  const methodName = tables.methodNames.selectOne({ typeId: typeName.id, name: "LoadAssemblies" });
  assert(!!methodName);

  const assertCalls = (where: Partial<Sql.Call>): void => {
    const found = tables.calls.selectWhere(where);
    assert(found.length > 0);
  };

  const assemblyId = Id.toBigAssemblyId(assembly.id);
  assertCalls({ fromId: assemblyId });
  assertCalls({ fromId: typeName.id });
  assertCalls({ fromId: methodName.id });

  assertCalls({ toId: methodName.id });
  assertCalls({ toId: typeName.id });
  assertCalls({ toId: assemblyId });
};

describe("backend2", () => {
  it("createTables(true)", async () => {
    const tables = await createDotNetTables(true);
    tables.close();
  });

  it("ancestors", async () => {
    const tables = await createDotNetTables(false);
    const assembly = tables.assemblies.selectOne({ name: "Core" });
    assert(!!assembly);
    const typeName = tables.typeNames.selectOne({ name: "CompilerGenerated", assemblyId: assembly.id });
    assert(!!typeName);
    const methodName = tables.methodNames.selectOne({ name: "LiftCompilerGenerated", typeId: typeName.id });
    assert(!!methodName);
    const namespace_ = tables.namespaces.selectOne({ name: "Core.CecilToLifted" });
    assert(!!namespace_);

    const ancestors = tables.ancestors.selectWhere({ descendentId: methodName.id });
    assert(ancestors.length > 3);
    const ancestorIds = new Set<bigint>(ancestors.map((ancestor) => ancestor.ancestorId));

    const assertId = (id: Id.AnyId) => assert(ancestorIds.has(BigInt(id)));
    assertId(typeName.id);
    assertId(assembly.id);
    assertId(namespace_.id);

    tables.close();
  });

  it("assertCalls", async () => {
    const tables = await createDotNetTables(false);
    assertCalls(tables);

    printLines("callsFromMethods.md", printCallFromMethods(tables, "Core"));
    printLines("callsFromTypes.md", printCallFromTypes(tables, "Core"));
    printLines("callsFromNamespaces.md", printCallFromNamespaces(tables, "Core"));
    printLines("callsFromAssemblies.md", printCallFromAssemblies(tables, "Core"));

    const result = listCallSizes(tables, "Core");

    const logCount = (methodName: string, lines: string[]) => log(`${methodName}: ${lines.length} records`);
    logCount("methods", result.methods);
    logCount("type", result.types);
    logCount("namespaces", result.namespaces);
    logCount("assemblies", result.assemblies);

    printLines("listFromMethods.md", result.methods);
    printLines("listFromTypes.md", result.types);
    printLines("listFromNamespaces.md", result.namespaces);
    printLines("listFromAssemblies.md", result.assemblies);

    const difference = (bigger: Set<string>, smaller: Set<string>): string[] =>
      [...bigger].filter((value) => !smaller.has(value));

    printLines("diffFromAssemblies.md", difference(result.setAssemblies, result.setTypes));
    printLines("diffFromNamespaces.md", difference(result.setNamespaces, result.setTypes));

    assert(
      result.setTypes.size == result.setMethods.size && difference(result.setMethods, result.setTypes).length == 0
    );

    printTypeRefs(tables);

    tables.close();
  });
});
