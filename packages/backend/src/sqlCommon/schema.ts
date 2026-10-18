import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { ConfigKvpT, ConfigT } from "./config";
import { GetSetNodeStatesT, nodeStateTablesT } from "./nodeStates";
export { Boolean, fromBoolean, toBoolean } from "./sqlBoolean"; // Boolean is a keyword so export it in the SqlCommon namespace

export type GroupT<TGroup extends Id.GroupId | Id.CustomGroupId> = { id: TGroup; name: string };
export type AncestorT<T extends Id.AnyBigId | Id.AnyCustomId> = { ancestorId: T; descendentId: T };

export const tableNames = ["groups", "ancestors", "configKvps"] as const;
export type TableName = (typeof tableNames)[number];

export interface CommonTypesT<
  T extends Id.AnyBigId | Id.AnyCustomId,
  TGroup extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
  TConfig extends ConfigT<TConfigKeys>,
> {
  TableRowMap: {
    //  row types of the common tables
    groups: GroupT<TGroup>;
    ancestors: AncestorT<T>;
    configKvps: ConfigKvpT<TConfigKeys>;
  };

  ExtraApis: { config: TConfig; viewNodeStates: (viewId: Id.ViewId) => GetSetNodeStatesT<T> };

  Tables: { [K in TableName]: SqlTable<this["TableRowMap"][K]> } & this["ExtraApis"];
}

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
): CommonTypesT<T, TGroup, TConfigKeys, TConfig>["Tables"] => {
  // zero exemplars
  const zeroGroup: GroupT<TGroup> = { id: zeroGroupId, name: "foo" };
  const zeroAncestor: AncestorT<T> = { ancestorId: zeroId, descendentId: zeroId };
  const zeroConfig: ConfigKvpT<TConfigKeys> = { key: "when", value: "foo" };

  const groups = db.newSqlTable("groups", "id", zeroGroup);
  const ancestors = db.newSqlTable("ancestors", ["ancestorId", "descendentId"], zeroAncestor, {
    index: ["ancestorId"],
    check: "ancestorId <> descendentId",
  });
  const configKvps = db.newSqlTable("configKvps", "key", zeroConfig);

  const config = newConfig(configKvps);

  const nodeStateTables = nodeStateTablesT(db, zeroId);
  const viewNodeStates = (viewId: Id.ViewId): GetSetNodeStatesT<T> => nodeStateTables(viewId);

  return { groups, ancestors, configKvps, config, viewNodeStates };
};
