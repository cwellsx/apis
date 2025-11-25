import { DataSource } from "backend-app";
import { SqlTable } from "sqlio";
import { methodNodeId, typeNodeId } from "sut/nodeIds";
import { createSqlLoadedFromCoreJson, GetTypeOrMethodName } from "sut/sql";
import { getTypeAndMethodNames } from "sut/sql/utils";
import { mapOfMaps } from "sut/utils";
import { fileWrite } from "./file";
import { fileCoreJson, fileDbDataJsonl, fileDbRawJsonl } from "./paths";

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
const toTabular = (rows: Columns[], sorted: boolean): unknown[] => {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const values = rows.map((row) => keys.map((key) => row[key]));
  if (sorted) values.sort();
  return [keys, ...values];
};
const writeJsonL = (fileName: string, rows: Columns[], sorted: boolean): void => {
  const tabular = toTabular(rows, sorted);
  const jsonl = toJsonL(tabular);
  fileWrite(fileName, jsonl);
};

const transformTable = (
  tableName: string,
  rows: Columns[],
  getTypeOrMethodName: GetTypeOrMethodName
): Columns[] | undefined => {
  type Func = (input: unknown, row: Columns) => unknown;

  const sortArray = (o: unknown): unknown => {
    if (!Array.isArray(o)) throw new Error("expected array");
    o.sort();
    return o;
  };

  const getTypeName = (assemblyNameKey: string): Func => {
    const result = (input: unknown, row: Columns): unknown => {
      const assemblyName = row[assemblyNameKey];
      if (!input) return null;
      if (typeof input !== "number") throw new Error("Expected token as input");
      if (typeof assemblyName !== "string") throw new Error("Expected assemblyName as string");
      try {
        return getTypeOrMethodName.getTypeName(typeNodeId(assemblyName, input));
      } catch {
        return `unknown(${input})`;
      }
    };
    return result;
  };
  const getMethodName = (assemblyNameKey: string): Func => {
    const result = (input: unknown, row: Columns): unknown => {
      const assemblyName = row[assemblyNameKey];
      if (!input) return null;
      if (typeof input !== "number") throw new Error("Expected token as input");
      if (typeof assemblyName !== "string") throw new Error("Expected assemblyName as string");
      try {
        return getTypeOrMethodName.getMethodName(methodNodeId(assemblyName, input));
      } catch {
        return `unknown(${input})`;
      }
    };
    return result;
  };

  const transforms = mapOfMaps<string, string, Func>([
    ["assembly", "references", sortArray],

    ["call", "fromTypeId", getTypeName("fromAssemblyName")],
    ["call", "fromMethodId", getMethodName("fromAssemblyName")],
    ["call", "toTypeId", getTypeName("toAssemblyName")],
    ["call", "toMethodId", getMethodName("toAssemblyName")],

    ["compilerMethod", "compilerType", getTypeName("assemblyName")],
    ["compilerMethod", "compilerMethod", getMethodName("assemblyName")],
    ["compilerMethod", "ownerType", getTypeName("assemblyName")],
    ["compilerMethod", "ownerMethod", getMethodName("assemblyName")],

    ["declaringType", "nestedType", getTypeName("assemblyName")],
    ["declaringType", "declaringType", getTypeName("assemblyName")],

    ["localsType", "ownerType", getTypeName("assemblyName")],
    ["localsType", "ownerMethod", getMethodName("assemblyName")],
    ["localsType", "compilerType", getTypeName("assemblyName")],

    // ["member", "metadataToken", getMethodName("assemblyName")],
    // ["member", "typeMetadataToken", getTypeName("assemblyName")],

    ["method", "metadataToken", getMethodName("assemblyName")],

    ["methodName", "metadataToken", getMethodName("assemblyName")],

    ["typeName", "metadataToken", getTypeName("assemblyName")],
  ]);

  const transform = (row: Columns, map: Map<string, Func>): Columns => {
    for (const [key, value] of Object.entries(row)) {
      const func = map.get(key);
      if (func) row[key] = func(value, row);
    }
    return row;
  };

  const map = transforms.get(tableName);
  if (!map) return;
  const transformed = rows.map((row) => transform(row, map));
  return transformed;
};

describe("sqlLoaded", () => {
  it("Can create database", async () => {
    const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
    const sqlLoaded = await createSqlLoadedFromCoreJson(dataSource);

    const tables = sqlLoaded.table;
    const entries = Object.entries(tables);

    const getTypeOrMethodName = getTypeAndMethodNames(tables);

    for (const [tableName, value] of entries) {
      if (!isTable(value)) continue;
      const rows = value.selectAll();
      writeJsonL(fileDbRawJsonl(tableName), rows, false);

      const transformed = transformTable(tableName, rows, getTypeOrMethodName);
      if (!transformed) continue;
      writeJsonL(fileDbDataJsonl(tableName), transformed, true);
    }

    sqlLoaded.close();
  });
});
