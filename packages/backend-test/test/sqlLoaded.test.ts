import { DataSource } from "backend-app";
import { createSqlLoadedFromCoreJson } from "sut/sql";
import { fileCoreJson } from "./paths";

describe("sqlLoaded", () => {
  it("Can create database", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const sqlLoaded = await createSqlLoadedFromCoreJson(dataSource);
    sqlLoaded.close();
  });
});
