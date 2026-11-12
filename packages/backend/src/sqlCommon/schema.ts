import { SqlDatabase, SqlTable } from "sqlio";
import { Id } from "../id2";
import { ConfigKvpT, ConfigT } from "./config";
import type { BooleanStateT } from "./nodeStates";
import { GetSetNodeStatesT, nodeStateTableNames, nodeStateTablesT } from "./nodeStates";
import { Boolean, fromBoolean } from "./sqlBoolean";
export { Boolean, fromBoolean, toBoolean } from "./sqlBoolean"; // Boolean is a keyword so export it in the SqlCommon namespace

export type GroupT<TGroupId extends Id.GroupId | Id.CustomGroupId> = { id: TGroupId; name: string };
export type AncestorT<T extends Id.AnyBigId | Id.AnyCustomId> = { ancestorId: T; descendentId: T; isParent: Boolean };

// the node state tables are among these: they are reached through viewNodeStates as well, but they are part of the
// database, so they are dropped and emptied along with the rest of it
export const tableNames = ["groups", "ancestors", "configKvps", ...nodeStateTableNames] as const;
export type TableName = (typeof tableNames)[number];

export interface CommonTypesT<
  T extends Id.AnyBigId | Id.AnyCustomId,
  TGroupId extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
  TConfig extends ConfigT<TConfigKeys>,
  TGroup extends GroupT<TGroupId>,
> {
  TableRowMap: {
    //  row types of the common tables
    groups: TGroup;
    ancestors: AncestorT<T>;
    configKvps: ConfigKvpT<TConfigKeys>;
    nodeHiddenStates: BooleanStateT<T>;
    nodeExpandedStates: BooleanStateT<T>;
  };

  ExtraApis: { config: TConfig; viewNodeStates: (viewId: Id.ViewId) => GetSetNodeStatesT<T> };

  Tables: { [K in TableName]: SqlTable<this["TableRowMap"][K]> } & this["ExtraApis"];
}

export const newTables = <
  T extends Id.AnyBigId | Id.AnyCustomId,
  TGroupId extends Id.GroupId | Id.CustomGroupId,
  TConfigKeys extends string,
  TConfig extends ConfigT<TConfigKeys>,
  TGroup extends GroupT<TGroupId>,
>(
  db: SqlDatabase,
  zeroId: T,
  //zeroGroupId: TGroupId,
  zeroGroup: TGroup,
  newConfig: (table: SqlTable<ConfigKvpT<TConfigKeys>>) => TConfig
): CommonTypesT<T, TGroupId, TConfigKeys, TConfig, TGroup>["Tables"] => {
  // zero exemplars
  //const zeroGroup: GroupT<TGroupId> = { id: zeroGroupId, name: "foo" };
  const zeroAncestor: AncestorT<T> = { ancestorId: zeroId, descendentId: zeroId, isParent: fromBoolean(false) };
  const zeroConfig: ConfigKvpT<TConfigKeys> = { key: "when", value: "foo" };

  const groups = db.newSqlTable("groups", "id", zeroGroup);
  const ancestors = db.newSqlTable("ancestors", ["ancestorId", "descendentId"], zeroAncestor, {
    index: ["ancestorId"],
    check: "ancestorId <> descendentId",
  });
  const configKvps = db.newSqlTable("configKvps", "key", zeroConfig);

  const config = newConfig(configKvps);

  const nodeStateTables = nodeStateTablesT(db, zeroId);
  const viewNodeStates = (viewId: Id.ViewId): GetSetNodeStatesT<T> => nodeStateTables.viewNodeStates(viewId);

  return {
    groups,
    ancestors,
    configKvps,
    config,
    viewNodeStates,
    nodeHiddenStates: nodeStateTables.nodeHiddenStates,
    nodeExpandedStates: nodeStateTables.nodeExpandedStates,
  };
};
