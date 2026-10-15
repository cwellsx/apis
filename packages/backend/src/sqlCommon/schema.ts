import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { zero } from "../id2";
import { ConfigKvpT, ConfigT } from "./config";
import { NodeStateT } from "./nodeStatesT";
import { Boolean } from "./sqlBoolean";

export type GroupT<TGroup extends Id.GroupId | Id.CustomGroupId> = { id: TGroup; name: string };
export type AncestorT<T extends Id.AnyBigId | Id.AnyCustomId> = { ancestorId: T; descendentId: T };

export const tableNames = ["nodeStates", "groups", "ancestors", "configKvps"] as const;

export type TableName = (typeof tableNames)[number];

export type TableRowMap<
  T extends Id.AnyBigId | Id.AnyCustomId,
  TGroup extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
> = {
  //  row types of the common tables
  nodeStates: NodeStateT<T>;
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

export type Tables<
  TId extends Id.AnyBigId | Id.AnyCustomId,
  TGroup extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
  TConfig extends ConfigT<TConfigKeys>,
> = { [K in TableName]: SqlTable<TableRow<K, TId, TGroup, TConfigKeys>> } & { config: TConfig };

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
  const zeroNodeState: NodeStateT<T> = {
    id: zeroId,
    viewId: zero.viewId,
    isHidden: 0 as Boolean,
    isExpanded: 0 as Boolean,
  };
  const zeroGroup: GroupT<TGroup> = { id: zeroGroupId, name: "foo" };
  const zeroAncestor: AncestorT<T> = { ancestorId: zeroId, descendentId: zeroId };
  const zeroConfig: ConfigKvpT<TConfigKeys> = { key: "when", value: "foo" };

  const nodeStates = db.newSqlTable("nodeStates", ["viewId", "id"], zeroNodeState);
  const groups = db.newSqlTable("groups", "id", zeroGroup);
  const ancestors = db.newSqlTable("ancestors", ["ancestorId", "descendentId"], zeroAncestor, {
    index: ["ancestorId"],
  });
  const configKvps = db.newSqlTable("configKvps", "key", zeroConfig);

  const config = newConfig(configKvps);

  return { nodeStates, groups, ancestors, configKvps, config };
};
