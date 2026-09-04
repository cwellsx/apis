import { createSqlDatabase } from "sqlio";
import type { All } from "../../contracts/dotnet2";
import { getSqlNodePath } from "../utils";
import { insertAll } from "./insertAll";
import { createTables, Tables } from "./schema";

export const openSql = (filename: string, when: string, all: All): Tables => {
  const db = createSqlDatabase(filename, getSqlNodePath());
  const tables = createTables(db);
  if (when != tables.config.getWhen()) {
    insertAll(all, tables);
    tables.config.setWhen(when);
  }
  return tables;
};
