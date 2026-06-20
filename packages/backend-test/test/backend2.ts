import { assert } from "backend-api";
import { DataSource } from "backend-app";
import { Id, Sql } from "sut/sql2";
import { createSqlCore } from "sut/sql2/createSqlCore";
import { isOwnerMethodDefId, isOwnerMethodSpecId, isOwnerTypeSpecId } from "sut/sql2/idTest";
import { printCallFromMethods, printCallFromTypes } from "sut/sql2/printCalls";
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

  printNamedOwners("typeSpec", isOwnerTypeSpecId);
  printNamedOwners("methodSpec", isOwnerMethodSpecId);
  printNamedOwners("methodDef", isOwnerMethodDefId);
};

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const { tables } = await createSqlCore(dataSource);

    printLines("callsFromMethods.md", printCallFromMethods(tables, "Core"));
    printLines("callsFromTypes.md", printCallFromTypes(tables, "Core"));

    testViewState("assemblies", tables);
    testViewState("namespaces", tables);

    printTypeRefs(tables);

    tables.close();
  });
});
