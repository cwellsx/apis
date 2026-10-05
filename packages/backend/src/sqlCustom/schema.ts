import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { zero } from "../id2";
import type { ConfigKvpT, ConfigT, CustomViewState } from "../sqlCommon";
import { configT, zeroCustomViewState } from "../sqlCommon";
import { log } from "../utils";

export type { Boolean, CustomViewState } from "../sqlCommon";

const schemaVersion = 1;

// config

type ConfigKvps = ConfigKvpT<"when">;
type Config = ConfigT<"when">;
const config = (table: SqlTable<ConfigKvps>): Config => configT<"when">(table);

// rows

export type Group = { id: Id.GroupId; name: string };

// tables

const tableNames = ["viewStates", "groups", "configKvps"] as const;

export type TableName = (typeof tableNames)[number];

type TableRowMap = {
  // these are common and should be declared in sqlCommon
  viewStates: CustomViewState;
  groups: Group;
  configKvps: ConfigKvps;
};

type TableRow<K extends TableName> = TableRowMap[K];
export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & { config: Config; close: () => void };
export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));
export const deleteAllTables = (tables: Tables) => tableNames.forEach((tableName) => tables[tableName].deleteAll());

const row: TableRowMap = {
  // common
  viewStates: zeroCustomViewState,
  groups: { id: zero.groupId, name: "foo" },
  configKvps: { key: "when", value: "value" },
};

export const createTables = (db: SqlDatabase): Tables => {
  const savedSchemaVersion = db.getUserSchemaVersion();
  if (savedSchemaVersion != schemaVersion) {
    // must create again
    log("dropping tables");
    dropTables(db);
  }
  const tables = newTables(db);
  db.setUserSchemaVersion(schemaVersion);
  return tables;
};

const newTables = (db: SqlDatabase): Tables => {
  // common
  const viewStates = db.newSqlTable("viewStates", ["viewId", "id"], row.viewStates);
  const groups = db.newSqlTable("groups", "id", row.groups);
  const configKvps = db.newSqlTable("configKvps", "key", row.configKvps);

  const close = () => {
    db.done();
    db.close();
  };

  return {
    // common
    viewStates,
    groups,
    configKvps,
    config: config(configKvps),
    close,
  };
};
