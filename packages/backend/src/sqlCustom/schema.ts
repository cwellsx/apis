import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { zero } from "../id2";
import type { ConfigKvpT, ConfigT, CustomViewState } from "../sqlCommon";
import { configT, zeroCustomViewState } from "../sqlCommon";
import { log } from "../utils";

export type { Boolean, CustomViewState } from "../sqlCommon";

const schemaVersion = 3;

// config

type ConfigKvps = ConfigKvpT<"when">;
type Config = ConfigT<"when">;
const config = (table: SqlTable<ConfigKvps>): Config => configT<"when">(table);

// rows

export type Item = { id: Id.CustomId; layer: string | undefined; label: string | undefined };
export type Edge = { fromId: Id.CustomId; toId: Id.CustomId };
export type ItemAttr = { id: Id.CustomId; name: string; value: string };
export type EdgeAttr = { fromId: Id.CustomId; toId: Id.CustomId; name: string; value: string };
export type ItemTag = { id: Id.CustomId; tag: string };
export type Layer = { layer: string }; // parent is calculated after extracting
// common
export type Group = { id: Id.GroupId; name: string };

// tables

const tableNames = [
  "items",
  "edges",
  "itemAttrs",
  "edgeAttrs",
  "itemTags",
  "layers",
  // common
  "viewStates",
  "groups",
  "configKvps",
] as const;

export type TableName = (typeof tableNames)[number];

type TableRowMap = {
  items: Item;
  edges: Edge;
  itemAttrs: ItemAttr;
  edgeAttrs: EdgeAttr;
  itemTags: ItemTag;
  layers: Layer;
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
  items: { id: zero.customId, layer: "foo", label: "foo" },
  edges: { fromId: zero.customId, toId: zero.customId },
  itemAttrs: { id: zero.customId, name: "foo", value: "foo" },
  edgeAttrs: { fromId: zero.customId, toId: zero.customId, name: "foo", value: "foo" },
  itemTags: { id: zero.customId, tag: "foo" },
  layers: { layer: "foo" },
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
  const items = db.newSqlTable("items", "id", row.items, { nullable: ["label", "layer"] });
  const edges = db.newSqlTable("edges", ["fromId", "toId"], row.edges, { index: ["fromId"] });
  const itemAttrs = db.newSqlTable("itemAttrs", ["id", "name"], row.itemAttrs);
  const edgeAttrs = db.newSqlTable("edgeAttrs", ["fromId", "toId", "name"], row.edgeAttrs);
  const itemTags = db.newSqlTable("itemTags", ["id", "tag"], row.itemTags);
  const layers = db.newSqlTable("layers", "layer", row.layers);
  // common
  const viewStates = db.newSqlTable("viewStates", ["viewId", "id"], row.viewStates);
  const groups = db.newSqlTable("groups", "id", row.groups);
  const configKvps = db.newSqlTable("configKvps", "key", row.configKvps);

  const close = () => {
    db.done();
    db.close();
  };

  return {
    items,
    edges,
    itemAttrs,
    edgeAttrs,
    itemTags,
    layers,
    // common
    viewStates,
    groups,
    configKvps,
    config: config(configKvps),
    close,
  };
};
