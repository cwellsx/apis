import { assert } from "backend-api";
import { DataSource } from "backend-app";
import { Sql } from "sut/sql2";
import { createSqlCore } from "sut/sql2/createSqlCore";
import { printCalls } from "sut/sql2/printCalls";
import type { ViewState, ViewType } from "sut/viewState";
import { createViewState } from "sut/viewState";
import { Forest, printForest } from "sut/viewState/forest";
import { fileWrite } from "./file";
import { fileCoreJson, fileViewState } from "./paths2";

const printLines = (filename: string, printed: string[]) => fileWrite(fileViewState(filename), printed.join("\r\n"));

const printViewState = (viewState: ViewState, viewType: ViewType, suffix: number): Forest => {
  const forest = viewState.getNewForest();
  const printed = printForest(forest);
  printLines(`${viewType}-${suffix}.txt`, printed);
  return forest;
};

const testViewState = (viewType: ViewType, tables: Sql.Tables): void => {
  const viewState = createViewState(tables, viewType);
  let suffix = 0;

  let forest = printViewState(viewState, viewType, suffix++);

  const node = viewState.getRootNode(forest, "Core");
  assert(!!node);
  viewState.setNodeState(node.nodeId, node.type, { isExpanded: true });

  forest = printViewState(viewState, viewType, suffix++);
};

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const { tables } = await createSqlCore(dataSource);
    printLines("calls.md", printCalls(tables, "Core"));
    testViewState("assemblies", tables);
    testViewState("namespaces", tables);
    tables.close();
  });
});
