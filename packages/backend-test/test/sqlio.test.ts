import { createSqlDatabase } from "sqlio";
import { pathNativeSqlite, pathTempDb } from "./paths";

describe("sqlio", () => {
  it("Can create database", () => {
    const db = createSqlDatabase(pathTempDb, pathNativeSqlite);
    db.done();
    db.close();
  });
});
