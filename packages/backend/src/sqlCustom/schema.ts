import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { zero } from "../id2";
import type { ConfigKvpT, ConfigT } from "../sqlCommon";
import { configT, SqlCommon } from "../sqlCommon";
import { log } from "../utils";

const schemaVersion = 1;

// config

type ConfigKeys = "when";
type ConfigKvps = ConfigKvpT<ConfigKeys>;
type Config = ConfigT<"when">;
const newConfig = (table: SqlTable<ConfigKvps>): Config => configT<"when">(table);

// rows

export type Item = { id: Id.CustomId; layer?: Id.CustomGroupId; label?: string };
export type Edge = { fromId: Id.CustomId; toId: Id.CustomId };
export type ItemAttr = { id: Id.CustomId; name: string; value: string };
export type EdgeAttr = { fromId: Id.CustomId; toId: Id.CustomId; name: string; value: string };
export type ItemTag = { id: Id.CustomId; tag: string };
export type Layer = { id: Id.CustomGroupId }; // parent is calculated after extracting

export type View = { id: Id.ViewId; viewName: string };
// common
export type Group = { id: Id.CustomGroupId };

// tables

const tableNames = [
  ...SqlCommon.tableNames,
  "items",
  "edges",
  "itemAttrs",
  "edgeAttrs",
  "itemTags",
  "layers",
  "views",
] as const;

export type TableName = (typeof tableNames)[number];

type CustomTableRowMap = {
  items: Item;
  edges: Edge;
  itemAttrs: ItemAttr;
  edgeAttrs: EdgeAttr;
  itemTags: ItemTag;
  layers: Layer;

  views: View;
};

type CommonType = SqlCommon.CommonTypesT<Id.AnyCustomId, Id.CustomGroupId, ConfigKeys, Config>;

type TableRowMap = CommonType["TableRowMap"] & CustomTableRowMap;

type TableRow<K extends TableName> = TableRowMap[K];

export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & CommonType["ExtraApis"] & { close: () => void };

export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));
export const deleteAllTables = (tables: Tables) => tableNames.forEach((tableName) => tables[tableName].deleteAll());

const row: CustomTableRowMap = {
  items: { id: zero.customId, layer: zero.customGroupId, label: "foo" },
  edges: { fromId: zero.customId, toId: zero.customId },
  itemAttrs: { id: zero.customId, name: "foo", value: "foo" },
  edgeAttrs: { fromId: zero.customId, toId: zero.customId, name: "foo", value: "foo" },
  itemTags: { id: zero.customId, tag: "foo" },
  layers: { id: zero.customGroupId },

  views: { id: zero.viewId, viewName: "foo" },
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
  const layers = db.newSqlTable("layers", "id", row.layers);

  const views = db.newSqlTable("views", "id", row.views);

  const close = () => {
    db.done();
    db.close();
  };

  return {
    ...SqlCommon.newTables(db, zero.anyCustomId, zero.customGroupId, newConfig),
    items,
    edges,
    itemAttrs,
    edgeAttrs,
    itemTags,
    layers,
    views,

    close,
  };
};
