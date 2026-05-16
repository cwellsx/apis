import { DataSource } from "backend-app";
import { createSqlCore } from "sut/sql2/createSqlCore";
import { createViewState } from "sut/viewState";
import { fileCoreJson } from "./paths2";

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const { tables } = await createSqlCore(dataSource);
    const viewState = createViewState(tables, "assemblies");
    const node = viewState.getTree();
    tables.close();
  });
});
