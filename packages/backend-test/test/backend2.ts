import { DataSource } from "backend-app";
import { createSqlCore } from "sut/sql2/createSqlCore";
import { createViewState, printForest } from "sut/viewState";
import { fileWrite } from "./file";
import { fileCoreJson, fileViewState } from "./paths2";

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const { tables } = await createSqlCore(dataSource);
    const viewState = createViewState(tables, "assemblies");
    const nodes = viewState.getTree();
    const printed = printForest(nodes);
    const path = fileViewState("defaultViewState.txt");
    fileWrite(path, printed.join("\r\n"));
    tables.close();
  });
});
