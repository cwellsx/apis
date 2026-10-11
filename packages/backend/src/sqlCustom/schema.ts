import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { zero } from "../id2";
import type { ConfigKvpT, ConfigT, CustomNodeState } from "../sqlCommon";
import { configT, zeroCustomNodeState } from "../sqlCommon";
import { log } from "../utils";

export type { Boolean, CustomNodeState as CustomViewState } from "../sqlCommon";

const schemaVersion = 5;

// config

type ConfigKvps = ConfigKvpT<"when">;
type Config = ConfigT<"when">;
const config = (table: SqlTable<ConfigKvps>): Config => configT<"when">(table);

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
  "items",
  "edges",
  "itemAttrs",
  "edgeAttrs",
  "itemTags",
  "layers",

  "views",
  // common
  "nodeStates",
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

  views: View;
  // these are common and should be declared in sqlCommon
  nodeStates: CustomNodeState;
  groups: Group;
  configKvps: ConfigKvps;
};

type TableRow<K extends TableName> = TableRowMap[K];
export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & { config: Config; close: () => void };
export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));
export const deleteAllTables = (tables: Tables) => tableNames.forEach((tableName) => tables[tableName].deleteAll());

const row: TableRowMap = {
  items: { id: zero.customId, layer: zero.customGroupId, label: "foo" },
  edges: { fromId: zero.customId, toId: zero.customId },
  itemAttrs: { id: zero.customId, name: "foo", value: "foo" },
  edgeAttrs: { fromId: zero.customId, toId: zero.customId, name: "foo", value: "foo" },
  itemTags: { id: zero.customId, tag: "foo" },
  layers: { id: zero.customGroupId },

  views: { id: zero.viewId, viewName: "foo" },
  // common
  nodeStates: zeroCustomNodeState,
  groups: { id: zero.customGroupId },
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
  const layers = db.newSqlTable("layers", "id", row.layers);

  const views = db.newSqlTable("views", "id", row.views);
  // common
  const nodeStates = db.newSqlTable("nodeStates", ["viewId", "id"], row.nodeStates);
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
    views,
    // common
    nodeStates,
    groups,
    configKvps,
    config: config(configKvps),
    close,
  };
};
