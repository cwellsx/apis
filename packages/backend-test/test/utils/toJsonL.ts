import path from "path";
import { SqlTable } from "sqlio";
import { fileWrite } from "./file";

type Columns = Record<string, unknown>;

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

const toTabular = (rows: Columns[], sorted: boolean): unknown[] => {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const values = rows.map((row) => keys.map((key) => row[key]));
  if (sorted) values.sort();
  return [keys, ...values];
};

export const rowsToJsonL = (fileName: string, rows: Columns[], sorted: boolean): void => {
  const tabular = toTabular(rows, sorted);
  const jsonl = toJsonL(tabular);
  fileWrite(fileName, jsonl);
};

export const isTable = (value: unknown): value is SqlTable<Columns> =>
  (value as SqlTable<Columns>).selectAll != undefined;

export const tablesToJsonL = (tables: object, directory: string): void => {
  for (const [key, value] of Object.entries(tables)) {
    if (!isTable(value)) continue;
    const rows = value.selectAll();
    const fileName = path.join(directory, `${key}.jsonl`);
    rowsToJsonL(fileName, rows, true);
  }
};
