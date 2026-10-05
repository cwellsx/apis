import { createSqlDatabase } from "sqlio";
import type { CustomElement } from "../customJson";
import { getSqlNodePath } from "../utils";
import { insertAll } from "./insertAll";
import { createTables, deleteAllTables, Tables } from "./schema";

export const openSqlCustom = (filename: string, when: string, all: CustomElement[]): Tables => {
  const db = createSqlDatabase(filename, getSqlNodePath());
  const tables = createTables(db);
  if (when != tables.config.getWhen()) {
    deleteAllTables(tables);
    insertAll(all, tables);
    tables.config.setWhen(when);
  }
  return tables;
};
