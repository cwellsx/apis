import { DataSource } from "backend-app";
import { Sql } from "sut/sql2";
import { createSqlCore } from "sut/sql2/createSqlCore";
import type { ViewType } from "sut/viewState";
import { createViewState, printForest } from "sut/viewState";
import { fileWrite } from "./file";
import { fileCoreJson, fileViewState } from "./paths2";

const printViewState = (viewType: ViewType, tables: Sql.Tables, filename: string): void => {
  const viewState = createViewState(tables, viewType);
  const nodes = viewState.getTree();
  const printed = printForest(nodes);
  const path = fileViewState(filename);
  fileWrite(path, printed.join("\r\n"));
};

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const { tables } = await createSqlCore(dataSource);
    printViewState("assemblies", tables, "defaultAssembliesViewState.txt");
    printViewState("namespaces", tables, "defaultNamespacesViewState.txt");
    tables.close();
  });
});
