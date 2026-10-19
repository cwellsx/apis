import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "../id2";
import { zero } from "../id2";
import type { ConfigKvpT, ConfigT } from "../sqlCommon";
import { configT, SqlCommon } from "../sqlCommon";
import { log } from "../utils";
import { MembersJson } from "./schemaMemberJson";
import { ViewType } from "./viewType";

const schemaVersion = 3;

// config

type ConfigKeys = "viewId";
type ConfigKvps = ConfigKvpT<ConfigKeys>;

type Config = ConfigT<"viewId"> & { getViewId: () => Id.ViewId | undefined; setViewId: (value: Id.ViewId) => void };

const newConfig = (table: SqlTable<ConfigKvps>): Config => {
  const base = configT<"viewId">(table);

  return {
    ...base,
    getViewId: () => Id.textToViewId(base.getConfig("viewId")),
    setViewId: (value: Id.ViewId) => base.setConfig("viewId", Id.viewIdToText(value)),
  };
};

// Ancestor

export type Ancestor = SqlCommon.AncestorT<Id.AnyBigId>;

// Caution -- don't use AnyId which is a mixture of bigint and number types

export type Assembly = { id: Id.AssemblyId; name: string; isMicrosoft: SqlCommon.Boolean };
export type Namespace = { id: Id.NamespaceId; assemblyId: Id.AssemblyId; name: string };
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

const tableNames = [
  ...SqlCommon.tableNames,
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
] as const;

export type TableName = (typeof tableNames)[number];

type DotNetTableRowMap = {
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
};

type CommonType = SqlCommon.CommonTypesT<Id.AnyBigId, Id.GroupId, ConfigKeys, Config>;

type TableRowMap = CommonType["TableRowMap"] & DotNetTableRowMap;

type TableRow<K extends TableName> = TableRowMap[K];

export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & CommonType["ExtraApis"] & { close: () => void };

export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));

export const deleteAllTables = (tables: Tables) => tableNames.forEach((tableName) => tables[tableName].deleteAll());

const zeroViewType: ViewType = "calls";

const row: DotNetTableRowMap = {
  assemblies: { id: zero.assemblyId, name: "foo", isMicrosoft: 0 as SqlCommon.Boolean },
  namespaces: { id: zero.namespaceId, assemblyId: zero.assemblyId, name: "foo" },
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

  const close = () => {
    db.done();
    db.close();
  };

  return {
    ...SqlCommon.newTables(db, zero.anyBigId, zero.groupId, newConfig),
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
    close,
  };
};
