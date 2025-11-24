import { DataSource } from "backend-app";
import { SqlTable } from "sqlio";
import { createSqlLoadedFromCoreJson } from "sut/sql";
import { fileWrite } from "./file";
import { fileCoreJson, fileSqlTableJsonl } from "./paths";
type Columns = Record<string, unknown>;
const isTable = (value: object): value is SqlTable<Columns> => (value as SqlTable<Columns>).selectAll != undefined;

const toJsonL = (rows: unknown[]): string => {
  const stringify = (value: unknown): string => {
    if (Array.isArray(value)) {
      return "[" + value.map((v) => stringify(v)).join(", ") + "]";
    } else if (value && typeof value === "object") {
      return (
        "{" +
        Object.entries(value)
          .map(([k, v]) => JSON.stringify(k) + ": " + stringify(v))
          .join(", ") +
        "}"
      );
    } else {
      return JSON.stringify(value);
    }
  };

  return rows.map((r) => stringify(r)).join("\n");
};

const toTabular = (rows: Columns[]): unknown[] => {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const values = rows.map((obj) => keys.map((k) => obj[k]));
  return [keys, ...values];
};

const writeJsonL = (tableName: string, rows: Columns[]): void => {
  const tabular = toTabular(rows);
  const jsonl = toJsonL(tabular);
  const fileName = fileSqlTableJsonl(tableName);
  return fileWrite(fileName, jsonl);
};

describe("sqlLoaded", () => {
  it("Can create database", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const sqlLoaded = await createSqlLoadedFromCoreJson(dataSource);

    const tables = sqlLoaded.table;
    const entries = Object.entries(tables);

    for (const [key, value] of entries) {
      if (!isTable(value)) continue;
      const rows = value.selectAll();
      writeJsonL(key, rows);
    }

    sqlLoaded.close();
  });
});
