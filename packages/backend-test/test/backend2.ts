import { assert } from "backend-api";
import { DataSource } from "backend-app";
import { Id, Sql } from "sut/sql2";
import { createSqlCore } from "sut/sql2/createSqlCore";
import { isOwnerTypeSpecId } from "sut/sql2/idTest";
import { printCalls } from "sut/sql2/printCalls";
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
    .selectAll<NamedOwner>({ ownerId: "signatureTypes.ownerId", fullName: "fullNames.fullName" })
    .filter((value) => isOwnerTypeSpecId(value.ownerId));
  const fullNames = namedOwners.map((value) => value.fullName);
  printLines("typeRefs.txt", fullNames.sort());
  const isNested = (fullName: string): boolean => {
    let result = false;
    let state = 0;
    for (const char of fullName) {
      switch (char) {
        case "<":
          if (++state > 1) result = true;
          break;
        case ">":
          --state;
          break;
      }
    }
    return result;
  };
  printLines("typeRefsNested.txt", fullNames.filter(isNested).sort());
};

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const { tables } = await createSqlCore(dataSource);

    printLines("calls.md", printCalls(tables, "Core"));

    testViewState("assemblies", tables);
    testViewState("namespaces", tables);

    printTypeRefs(tables);

    tables.close();
  });
});
