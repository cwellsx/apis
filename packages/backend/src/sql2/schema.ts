import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { zero } from "../id2";
import type { Boolean, ConfigKvpT, ConfigT, ViewState } from "../sqlCommon";
import { configT } from "../sqlCommon";
import { log } from "../utils";
import { MembersJson } from "./schemaMemberJson";
import { ViewType } from "./viewType";
export type { Boolean, ViewState } from "../sqlCommon";

const schemaVersion = 1;

// config

type ConfigKvps = ConfigKvpT<"viewId">;

type Config = ConfigT<"viewId"> & { getViewId: () => Id.ViewId | undefined; setViewId: (value: Id.ViewId) => void };

const config = (table: SqlTable<ConfigKvps>): Config => {
  const base = configT<"viewId">(table);

  return {
    ...base,
    getViewId: () => Id.textToViewId(base.getConfig("viewId")),
    setViewId: (value: Id.ViewId) => base.setConfig("viewId", Id.viewIdToText(value)),
  };
};

// Caution -- don't use AnyId which is a mixture of bigint and number types

export type Assembly = { id: Id.AssemblyId; name: string; isMicrosoft: Boolean };
export type Namespace = { id: Id.NamespaceId; name: string };
export type TypeName = {
  id: Id.TypeDefId;
  assemblyId: Id.AssemblyId;
  namespaceId?: Id.NamespaceId;
  name: string;
  declaringTypeId?: Id.TypeDefId;
};
export type Member = { id: Id.MemberId; typeId: Id.TypeDefId; name: string; json: MembersJson };

export type Reference = { fromId: Id.AssemblyId; toId: Id.AssemblyId };

export type MethodName = { id: Id.MethodDefId; typeId: Id.TypeDefId; name: string; returnTypeId: Id.TypeId };

export type TypeSpec = { id: Id.TypeSpecId; resolvedId: Id.BaseTypeId; suffix?: string };
export type MethodSpec = { id: Id.MethodSpecId; resolvedId: Id.MethodDefId; declaringTypeSpecId?: Id.TypeSpecId };

// SignatureTypes is used for generic type arguments, for method parameters, and for generic method arguments
export type SignatureType = { ownerId: Id.AnyOwnerId; seqno: number; argumentId: Id.TypeId };
export type GenericParam = { id: Id.GenericParamId; ownerId: Id.AnyDefId; seqno: number; name: string };

export type Decompiled = { id: Id.MethodDefId; asText: string };
export type Call = { fromId: Id.CallFromId; toId: Id.CallToId };

export type FullName = { id: Id.AnyBigId; fullName: string };

export type View = { id: Id.ViewId; viewType: ViewType; viewName: string };

// isExpanded will be false for leaf-type nodes

export type Group = { id: Id.GroupId; name: string };

const tableNames = [
  "assemblies",
  "namespaces",
  "typeNames",
  "members",

  "references",

  "methodNames",

  "typeSpecs",
  "methodSpecs",

  "signatureTypes",
  "genericParams",

  "decompiled",
  "calls",

  "fullNames",

  "views",
  "viewStates",

  "groups",

  "configKvps",
] as const;

export type TableName = (typeof tableNames)[number];

type TableRowMap = {
  assemblies: Assembly;
  namespaces: Namespace;
  typeNames: TypeName;
  members: Member;
  references: Reference;
  methodNames: MethodName;
  typeSpecs: TypeSpec;
  methodSpecs: MethodSpec;
  signatureTypes: SignatureType;
  genericParams: GenericParam;
  decompiled: Decompiled;
  calls: Call;
  fullNames: FullName;
  views: View;
  viewStates: ViewState;
  groups: Group;
  configKvps: ConfigKvps;
};

type TableRow<K extends TableName> = TableRowMap[K];

export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & { config: Config; close: () => void };

export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));

export const deleteAllTables = (tables: Tables) => tableNames.forEach((tableName) => tables[tableName].deleteAll());

const zeroViewType: ViewType = "calls";

const row: TableRowMap = {
  assemblies: { id: zero.assemblyId, name: "foo", isMicrosoft: 0 as Boolean },
  namespaces: { id: zero.namespaceId, name: "foo" },
  typeNames: {
    id: zero.typeDefId,
    name: "foo",
    assemblyId: zero.assemblyId,
    namespaceId: zero.namespaceId,
    declaringTypeId: zero.typeDefId,
  },
  members: { id: zero.memberId, typeId: zero.typeDefId, name: "foo", json: {} as MembersJson },

  references: { fromId: zero.assemblyId, toId: zero.assemblyId },

  methodNames: { id: zero.methodDefId, typeId: zero.typeDefId, name: "foo", returnTypeId: zero.typeId },

  typeSpecs: { id: zero.typeSpecId, resolvedId: zero.typeDefId, suffix: "foo" },
  methodSpecs: { id: zero.methodSpecId, resolvedId: zero.methodDefId, declaringTypeSpecId: zero.typeSpecId },
  signatureTypes: { ownerId: zero.typeSpecId, seqno: 0, argumentId: zero.typeId },
  genericParams: { id: zero.genericParamId, ownerId: zero.typeDefId, seqno: 0, name: "foo" },

  decompiled: { id: zero.methodDefId, asText: "foo" },
  calls: { fromId: zero.methodDefId, toId: zero.methodId },

  fullNames: { id: zero.anyBigId, fullName: "foo" },
  views: { id: zero.viewId, viewType: zeroViewType, viewName: "foo" },
  viewStates: { id: zero.anyBigId, viewId: zero.viewId, isHidden: 0 as Boolean, isExpanded: 0 as Boolean },

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
  const assemblies = db.newSqlTable("assemblies", "id", row.assemblies);
  const namespaces = db.newSqlTable("namespaces", "id", row.namespaces);
  const typeNames = db.newSqlTable("typeNames", "id", row.typeNames, { nullable: ["namespaceId", "declaringTypeId"] });
  const members = db.newSqlTable("members", "id", row.members);

  const references = db.newSqlTable("references", ["fromId", "toId"], row.references);

  const methodNames = db.newSqlTable("methodNames", "id", row.methodNames);

  const typeSpecs = db.newSqlTable("typeSpecs", "id", row.typeSpecs, { nullable: ["suffix"] });
  const methodSpecs = db.newSqlTable("methodSpecs", "id", row.methodSpecs, { nullable: ["declaringTypeSpecId"] });
  const signatureTypes = db.newSqlTable("signatureTypes", ["ownerId", "seqno"], row.signatureTypes);
  const genericParams = db.newSqlTable("genericParams", ["id", "seqno"], row.genericParams);

  const decompiled = db.newSqlTable("decompiled", "id", row.decompiled);
  const calls = db.newSqlTable("calls", ["fromId", "toId"], row.calls, { index: ["fromId"] });

  const fullNames = db.newSqlTable("fullNames", "id", row.fullNames);
  const views = db.newSqlTable("views", "id", row.views);
  const viewStates = db.newSqlTable("viewStates", ["viewId", "id"], row.viewStates);

  const groups = db.newSqlTable("groups", "id", row.groups);

  const configKvps = db.newSqlTable("configKvps", "key", row.configKvps);

  const close = () => {
    db.done();
    db.close();
  };

  return {
    assemblies,
    namespaces,
    typeNames,
    members,
    references,
    methodNames,
    typeSpecs,
    methodSpecs,
    signatureTypes,
    genericParams,
    decompiled,
    calls,
    fullNames,
    views,
    viewStates,
    groups,
    configKvps,
    config: config(configKvps),
    close,
  };
};
