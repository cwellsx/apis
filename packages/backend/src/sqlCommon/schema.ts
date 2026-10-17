import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { ConfigKvpT, ConfigT } from "./config";
import { GetSetNodeStatesT, nodeStateTablesT } from "./nodeStates";

// Boolean is also a keyword, so, export and import it in the SqlCommon namespace
export { Boolean, fromBoolean, toBoolean } from "./sqlBoolean";

export type GroupT<TGroup extends Id.GroupId | Id.CustomGroupId> = { id: TGroup; name: string };
export type AncestorT<T extends Id.AnyBigId | Id.AnyCustomId> = { ancestorId: T; descendentId: T };

export const tableNames = ["groups", "ancestors", "configKvps"] as const;

export type TableName = (typeof tableNames)[number];

export type TableRowMap<
  T extends Id.AnyBigId | Id.AnyCustomId,
  TGroup extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
> = {
  //  row types of the common tables
  groups: GroupT<TGroup>;
  ancestors: AncestorT<T>;
  configKvps: ConfigKvpT<TConfigKeys>;
};

type TableRow<
  K extends TableName,
  T extends Id.AnyBigId | Id.AnyCustomId,
  TGroup extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
> = TableRowMap<T, TGroup, TConfigKeys>[K];

export type ExtraApis<
  TId extends Id.AnyBigId | Id.AnyCustomId,
  TConfigKeys extends string,
  TConfig extends ConfigT<TConfigKeys>,
> = { config: TConfig; viewNodeStates: (viewId: Id.ViewId) => GetSetNodeStatesT<TId> };

export type Tables<
  TId extends Id.AnyBigId | Id.AnyCustomId,
  TGroup extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
  TConfig extends ConfigT<TConfigKeys>,
> = { [K in TableName]: SqlTable<TableRow<K, TId, TGroup, TConfigKeys>> } & ExtraApis<TId, TConfigKeys, TConfig>;

export const newTables = <
  T extends Id.AnyBigId | Id.AnyCustomId,
  TGroup extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
  TConfig extends ConfigT<TConfigKeys>,
>(
  db: SqlDatabase,
  zeroId: T,
  zeroGroupId: TGroup,
  newConfig: (table: SqlTable<ConfigKvpT<TConfigKeys>>) => TConfig
): Tables<T, TGroup, TConfigKeys, TConfig> => {
  // zero exemplars
  const zeroGroup: GroupT<TGroup> = { id: zeroGroupId, name: "foo" };
  const zeroAncestor: AncestorT<T> = { ancestorId: zeroId, descendentId: zeroId };
  const zeroConfig: ConfigKvpT<TConfigKeys> = { key: "when", value: "foo" };

  const groups = db.newSqlTable("groups", "id", zeroGroup);
  const ancestors = db.newSqlTable("ancestors", ["ancestorId", "descendentId"], zeroAncestor, {
    index: ["ancestorId"],
  });
  const configKvps = db.newSqlTable("configKvps", "key", zeroConfig);

  const config = newConfig(configKvps);

  const nodeStateTables = nodeStateTablesT(db, zeroId);
  const viewNodeStates = (viewId: Id.ViewId): GetSetNodeStatesT<T> => nodeStateTables(viewId);

  return { groups, ancestors, configKvps, config, viewNodeStates };
};
