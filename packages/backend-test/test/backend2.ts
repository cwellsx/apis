import { DataSource } from "backend-app";
import { createSqlCore } from "sut/sql2/createSqlCore";
import { fileCoreJson } from "./paths2";

describe("backend2", () => {
  it("loadCoreJson", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const all = await createSqlCore(dataSource);
  });
});
