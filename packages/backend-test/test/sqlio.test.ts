import { createSqlDatabase } from "sqlio";
import { fileNativeSqlite, fileTempDb } from "./paths";

describe("sqlio", () => {
  it("Can create database", () => {
    const db = createSqlDatabase(fileTempDb, fileNativeSqlite);
    db.done();
    db.close();
  });
});
