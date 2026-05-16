import { SqlDatabase, SqlTable } from "sqlio";
import * as IdCast from "./idCast";
import * as Id from "./idTypes";
import { MembersJson } from "./schemaMemberJson";

export type Boolean = 0 | 1;
export type ViewType = "assemblies" | "namespaces";

export type Assembly = { id: Id.AssemblyId; name: string; isMicrosoft: Boolean };
export type Namespace = { id: Id.NamespaceId; name: string };
export type TypeName = { id: Id.TypeDefId; namespaceId?: Id.NamespaceId; name: string; declaringTypeId?: Id.TypeDefId };
export type Member = { id: Id.MemberId; typeId: Id.TypeDefId; name: string; json: MembersJson };

export type MethodName = { id: Id.MethodDefId; typeId: Id.TypeDefId; name: string; returnTypeId: Id.TypeId };

export type TypeReference = { id: Id.TypeRefId; resolvedId: Id.BaseTypeId; suffix?: string };
export type MethodReference = { id: Id.MethodRefId; resolvedId: Id.MethodDefId };

// SignatureTypes is used for generic type arguments, for method parameters, and for generic method arguments
export type SignatureType = { ownerId: Id.AnyOwnerId; seqno: number; argumentId: Id.TypeId };
export type GenericParam = { id: Id.GenericParamId; ownerId: Id.AnyDefId; seqno: number; name: string };

export type Decompiled = { id: Id.MethodDefId; asText: string };
export type Call = { fromId: Id.MethodDefId; toId: Id.MethodId };

export type FullName = { id: Id.AnyId; fullName: string };

export type View = { id: Id.ViewId; viewType: ViewType }; // in future could add `name: string` column to support multiple view instance
export type ViewState = { viewId: Id.ViewId; id: Id.AnyId; isHidden: Boolean; isExpanded: Boolean };

export type AssemblyGroup = { id: Id.AssemblyGroupId; name: string };
export type NamespaceGroup = { id: Id.NamespaceGroupId; name: string };

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

  "assemblyGroups",
  "namespaceGroups",
] as const;

export type TableName = (typeof tableNames)[number];

type TableRowMap = {
  assemblies: Assembly;
  namespaces: Namespace;
  typeNames: TypeName;
  members: Member;
  methodNames: MethodName;
  typeReferences: TypeReference;
  methodReferences: MethodReference;
  signatureTypes: SignatureType;
  genericParams: GenericParam;
  decompiled: Decompiled;
  calls: Call;
  fullNames: FullName;
  views: View;
  viewStates: ViewState;
  assemblyGroups: AssemblyGroup;
  namespaceGroups: NamespaceGroup;
};

type TableRow<K extends TableName> = TableRowMap[K];

export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & { close: () => void };

export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));

const zero = {
  // number
  assemblyId: IdCast.castAssemblyId(0),
  namespaceId: IdCast.castNamespaceId(0),
  assemblyGroupId: IdCast.castAssemblyGroupId(0),
  namespaceGroupId: IdCast.castNamespaceGroupId(0),
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

const row: TableRowMap = {
  assemblies: { id: zero.assemblyId, name: "foo", isMicrosoft: 0 as Boolean },
  namespaces: { id: zero.namespaceId, name: "foo" },
  typeNames: { id: zero.typeDefId, name: "foo", namespaceId: zero.namespaceId, declaringTypeId: zero.typeDefId },
  members: { id: zero.memberId, typeId: zero.typeDefId, name: "foo", json: {} as MembersJson },

  methodNames: { id: zero.methodDefId, typeId: zero.typeDefId, name: "foo", returnTypeId: zero.typeId },

  typeReferences: { id: zero.typeRefId, resolvedId: zero.typeDefId, suffix: "foo" },
  methodReferences: { id: zero.methodRefId, resolvedId: zero.methodDefId },
  signatureTypes: { ownerId: zero.typeRefId, seqno: 0, argumentId: zero.typeId },
  genericParams: { id: zero.genericParamId, ownerId: zero.typeDefId, seqno: 0, name: "foo" },

  decompiled: { id: zero.methodDefId, asText: "foo" },
  calls: { fromId: zero.methodDefId, toId: zero.methodId },

  fullNames: { id: zero.anyId, fullName: "foo" },
  views: { id: zero.viewId, viewType: "assemblies" as ViewType },
  viewStates: { id: zero.anyId, viewId: zero.viewId, isHidden: 0 as Boolean, isExpanded: 0 as Boolean },

  assemblyGroups: { id: zero.assemblyGroupId, name: "foo" },
  namespaceGroups: { id: zero.namespaceGroupId, name: "foo" },
};

// CREATE TABLE Child (
//     id INTEGER PRIMARY KEY,
//     parent_id INTEGER NOT NULL,
//     FOREIGN KEY (parent_id) REFERENCES Parent(id)
// );

export const createTables = (db: SqlDatabase): Tables => {
  const assemblies = db.newSqlTable("assemblies", "id", [], row.assemblies);
  const namespaces = db.newSqlTable("namespaces", "id", [], row.namespaces);
  const typeNames = db.newSqlTable("typeNames", "id", ["namespaceId", "declaringTypeId"], row.typeNames);
  const members = db.newSqlTable("members", "id", [], row.members);
  const methodNames = db.newSqlTable("methodNames", "id", [], row.methodNames);

  const typeReferences = db.newSqlTable("typeReferences", "id", ["suffix"], row.typeReferences);
  const methodReferences = db.newSqlTable("methodReferences", "id", [], row.methodReferences);
  const signatureTypes = db.newSqlTable("signatureTypes", ["ownerId", "seqno"], [], row.signatureTypes);
  const genericParams = db.newSqlTable("genericParams", ["id", "seqno"], [], row.genericParams);

  const decompiled = db.newSqlTable("decompiled", "id", [], row.decompiled);
  const calls = db.newSqlTable("calls", ["fromId", "toId"], [], row.calls);

  const fullNames = db.newSqlTable("fullNames", "id", [], row.fullNames);
  const views = db.newSqlTable("views", "id", [], row.views);
  const viewStates = db.newSqlTable("viewStates", "id", [], row.viewStates);

  const assemblyGroups = db.newSqlTable("assemblyGroups", "id", [], row.assemblyGroups);
  const namespaceGroups = db.newSqlTable("namespaceGroups", "id", [], row.namespaceGroups);

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
    assemblyGroups,
    namespaceGroups,
    close,
  };
};
