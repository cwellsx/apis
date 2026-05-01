import { SqlDatabase, SqlTable } from "sqlio";
import * as IdCast from "./idCast";
import * as Id from "./idTypes";
import { MembersJson } from "./memberJson";

export type Boolean = 0 | 1;
export type ViewType = "assemblies" | "namespaces";

export type Assemblies = { id: Id.AssemblyId; name: string; isMicrosoft: Boolean };
export type Namespaces = { id: Id.NamespaceId; name: string };
export type TypeNames = { id: Id.TypeDefId; namespace?: Id.NamespaceId; name: string; declaringType?: Id.TypeDefId };
export type Members = { id: Id.MemberId; typeId: Id.TypeDefId; name: string; json: MembersJson };

export type MethodNames = { id: Id.MethodDefId; typeId: Id.TypeDefId; name: string; returnType: Id.TypeId };

export type TypeReferences = { id: Id.TypeRefId; resolved: Id.BaseTypeId; suffix?: string };
export type MethodReferences = { id: Id.MethodRefId; resolved: Id.MethodDefId };

// SignatureTypes is used for generic type arguments, for method parameters, and for generic method arguments
export type SignatureTypes = { ownerId: Id.AnyOwnerId; seqno: number; argument: Id.TypeId };
export type GenericParams = { id: Id.GenericParamId; ownerId: Id.AnyDefId; seqno: number; name: string };

export type Decompiled = { id: Id.MethodDefId; asText: string };
export type Calls = { fromId: Id.MethodDefId; toId: Id.MethodId };

export type FullNames = { id: Id.AnyId; fullName: string };

export type Views = { id: Id.ViewId; name: string; viewType: ViewType };
export type ViewStates = { viewId: Id.ViewId; id: Id.AnyId; isHidden: Boolean; isExpanded: Boolean };

export const tableNames = [
  "assemblies",
  "namespaces",
  "typeNames",
  "members",

  "methodNames",

  "typeReferences",
  "methodReferences",

  "signatureTypes",
  "genericParams",

  "decompiled",
  "calls",

  "fullNames",

  "views",
  "viewStates",
] as const;

export type TableName = (typeof tableNames)[number];

type TableRowMap = {
  assemblies: Assemblies;
  namespaces: Namespaces;
  typeNames: TypeNames;
  members: Members;
  methodNames: MethodNames;
  typeReferences: TypeReferences;
  methodReferences: MethodReferences;
  signatureTypes: SignatureTypes;
  genericParams: GenericParams;
  decompiled: Decompiled;
  calls: Calls;
  fullNames: FullNames;
  views: Views;
  viewStates: ViewStates;
};

export type TableRow<K extends TableName> = TableRowMap[K];

export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & { close: () => void };

export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));

const zero = {
  // number
  assemblyId: IdCast.castAssemblyId(0),
  namespaceId: IdCast.castNamespaceId(0),
  viewId: IdCast.castViewId(0),
  // bigint
  typeDefId: IdCast.castTypeDefId(0n),
  typeRefId: IdCast.castTypeRefId(0n),
  genericParamId: IdCast.castGenericParamId(0n),

  typeId: IdCast.castTypeRefId(0n),
  methodDefId: IdCast.castMethodDefId(0n),
  methodRefId: IdCast.castMethodRefId(0n),
  methodId: IdCast.castMethodDefId(0n),
  memberId: IdCast.castMemberId(0n),
  anyId: IdCast.castAnyId(0n),
};

const row = {
  assemblies: { id: zero.assemblyId, name: "foo", isMicrosoft: 0 as Boolean },
  namespaces: { id: zero.namespaceId, name: "foo" },
  typeNames: { id: zero.typeDefId, name: "foo", namespace: zero.namespaceId, declaringType: zero.typeDefId },
  members: { id: zero.memberId, typeId: zero.typeDefId, name: "foo", json: {} as MembersJson },

  methodNames: { id: zero.methodDefId, typeId: zero.typeDefId, name: "foo", returnType: zero.typeId },

  typeReferences: { id: zero.typeRefId, resolved: zero.typeDefId, suffix: "foo" },
  methodReferences: { id: zero.methodRefId, resolved: zero.methodDefId },
  signatureTypes: { ownerId: zero.typeRefId, seqno: 0, argument: zero.typeId },
  genericParams: { id: zero.genericParamId, ownerId: zero.typeDefId, seqno: 0, name: "foo" },

  decompiled: { id: zero.methodDefId, asText: "foo" },
  calls: { fromId: zero.methodDefId, toId: zero.methodId },

  fullNames: { id: zero.anyId, fullName: "foo" },
  views: { id: zero.viewId, name: "foo", viewType: "assemblies" as ViewType },
  viewsStates: { id: zero.anyId, viewId: zero.viewId, isHidden: 0 as Boolean, isExpanded: 0 as Boolean },
};

// CREATE TABLE Child (
//     id INTEGER PRIMARY KEY,
//     parent_id INTEGER NOT NULL,
//     FOREIGN KEY (parent_id) REFERENCES Parent(id)
// );

export const createTables = (db: SqlDatabase): Tables => {
  const assemblies = db.newSqlTable<Assemblies>("assemblies", "id", [], row.assemblies);
  const namespaces = db.newSqlTable<Namespaces>("namespaces", "id", [], row.namespaces);
  const typeNames = db.newSqlTable<TypeNames>("typeNames", "id", ["namespace", "declaringType"], row.typeNames);
  const members = db.newSqlTable<Members>("members", "id", [], row.members);
  const methodNames = db.newSqlTable<MethodNames>("methodNames", "id", [], row.methodNames);

  const typeReferences = db.newSqlTable<TypeReferences>("typeReferences", "id", ["suffix"], row.typeReferences);
  const methodReferences = db.newSqlTable<MethodReferences>("methodReferences", "id", [], row.methodReferences);
  const signatureTypes = db.newSqlTable<SignatureTypes>("signatureTypes", ["ownerId", "seqno"], [], row.signatureTypes);
  const genericParams = db.newSqlTable<GenericParams>("genericParams", ["id", "seqno"], [], row.genericParams);

  const decompiled = db.newSqlTable<Decompiled>("decompiled", "id", [], row.decompiled);
  const calls = db.newSqlTable<Calls>("calls", ["fromId", "toId"], [], row.calls);

  const fullNames = db.newSqlTable<FullNames>("fullNames", "id", [], row.fullNames);
  const views = db.newSqlTable<Views>("views", "id", [], row.views);
  const viewStates = db.newSqlTable<ViewStates>("viewStates", "id", [], row.viewsStates);

  const close = () => {
    db.done();
    db.close();
  };

  return {
    assemblies,
    namespaces,
    typeNames,
    members,
    methodNames,
    typeReferences,
    methodReferences,
    signatureTypes,
    genericParams,
    decompiled,
    calls,
    fullNames,
    views,
    viewStates,
    close,
  };
};
