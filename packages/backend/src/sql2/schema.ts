import { SqlDatabase, SqlTable } from "sqlio";

export type Id = bigint;
export type Boolean = 0 | 1;

export type Assemblies = { id: Id; name: string; isMicrosoft: Boolean };
export type Namespaces = { id: Id; name: string };
export type TypeInfos = { id: Id; namespace?: Id; name: string; declaringType?: Id };
export type Members = { id: Id; typeId: Id; name: string; json: string };
export type FullNames = { id: Id; fullName: string };

export type Views = { id: Id; name: string };
export type ViewStates = { viewId: Id; id: Id; isHidden: Boolean; isExpanded: Boolean };

export type Calls = { fromId: Id; toId: Id };

export const tableNames = [
  "assemblies",
  "namespaces",
  "typeInfos",
  "members",
  "fullNames",
  "views",
  "viewStates",
  "calls",
] as const;

export type TableName = (typeof tableNames)[number];

export type TableRow<K extends TableName> = K extends "assemblies"
  ? Assemblies
  : K extends "namespaces"
    ? Namespaces
    : K extends "typeInfos"
      ? TypeInfos
      : K extends "members"
        ? Members
        : K extends "fullNames"
          ? FullNames
          : K extends "views"
            ? Views
            : K extends "viewStates"
              ? ViewStates
              : K extends "calls"
                ? Calls
                : never;

export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & { close: () => void };

export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));

export const createTables = (db: SqlDatabase): Tables => {
  const assemblies = db.newSqlTable<Assemblies>("assemblies", "id", [], { id: 0n, name: "foo", isMicrosoft: 0 });
  const namespaces = db.newSqlTable<Namespaces>("namespaces", "id", [], { id: 0n, name: "foo" });
  const typeInfos = db.newSqlTable<TypeInfos>("typeInfos", "id", ["namespace", "declaringType"], {
    id: 0n,
    name: "foo",
    namespace: 0n,
    declaringType: 0n,
  });
  const members = db.newSqlTable<Members>("members", "id", [], { id: 0n, typeId: 0n, name: "foo", json: "" });
  const fullNames = db.newSqlTable<FullNames>("fullNames", "id", [], { id: 0n, fullName: "foo" });
  const views = db.newSqlTable<Views>("views", "id", [], { id: 0n, name: "foo" });
  const viewStates = db.newSqlTable<ViewStates>("viewStates", "id", [], {
    id: 0n,
    viewId: 0n,
    isHidden: 0,
    isExpanded: 0,
  });
  const calls = db.newSqlTable<Calls>("calls", "fromId", [], { fromId: 0n, toId: 0n });

  const close = () => {
    db.done();
    db.close();
  };

  return { assemblies, namespaces, typeInfos, members, fullNames, views, viewStates, calls, close };
};
