import { assert, log } from "backend-api";
import { DataSource } from "backend-app";
import * as Id from "sut/id2";
import { Sql } from "sut/sql2";
import { createSqlCore } from "sut/sql2/createSqlCore";
import {
  listCallSizes,
  printCallFromAssemblies,
  printCallFromMethods,
  printCallFromNamespaces,
  printCallFromTypes,
} from "sut/sql2/printCalls";
import type { ViewType } from "sut/viewState";
import { createViewState } from "sut/viewState";
import { Forest, printForest } from "sut/viewState/forest";
import { fileWrite } from "./file";
import { fileCoreJson, fileViewState } from "./paths2";

const printLines = (filename: string, printed: string[]) => fileWrite(fileViewState(filename), printed.join("\r\n"));

const testViewState = (viewType: ViewType, tables: Sql.Tables): void => {
  const viewState = createViewState(tables, viewType);
  let suffix = 0;

  const printViewState = (): Forest => {
    const forest = viewState.getNewForest();
    const printed = printForest(forest);
    printLines(`${viewType}-${suffix++}.txt`, printed);
    return forest;
  };

  let forest = printViewState();

  const node = viewState.getRootNode(forest, "Core");
  assert(!!node);
  viewState.setNodeState(node.nodeId, node.type, { isExpanded: true });

  forest = printViewState();
};

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

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const { tables } = await createSqlCore(dataSource);

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

    testViewState("assemblies", tables);
    testViewState("namespaces", tables);

    printTypeRefs(tables);

    tables.close();
  });
});
