import { SqlDatabase, SqlTable } from "sqlio";
import * as Id from "./bigIds";
import { MembersJson } from "./memberJson";

export type Boolean = 0 | 1;
export type ViewType = "assemblies" | "namespaces";

export type Assemblies = { id: Id.AssemblyId; name: string; isMicrosoft: Boolean };
export type Namespaces = { id: Id.NamespaceId; name: string };
export type TypeNames = { id: Id.TypeDefId; namespace?: Id.NamespaceId; name: string; declaringType?: Id.TypeDefId };
export type Members = { id: Id.MemberId; typeId: Id.TypeDefId; name: string; json: MembersJson };

export type MethodNames = { id: Id.MethodDefId; name: string; returnType: Id.TypeId };

export type TypeReferences = { id: Id.TypeRefId; resolved: Id.BaseTypeId; suffix?: string };

// used for generic type arguments, method parameters, and generic method arguments
export type SignatureTypes = { ownerId: Id.AnyOwnerId; seqno: number; argument: Id.TypeId };

export type GenericParams = { id: Id.GenericParamId; owner: Id.AnyDefId; seqno: number; name: string };

export type FullNames = { id: Id.AnyId; fullName: string };

export type Views = { id: Id.ViewId; name: string; viewType: ViewType };
export type ViewStates = { viewId: Id.ViewId; id: Id.AnyId; isHidden: Boolean; isExpanded: Boolean };

export type Calls = { fromId: Id.MethodId; toId: Id.MethodId };

export const tableNames = [
  "assemblies",
  "namespaces",
  "typeNames",
  "members",

  "methodNames",

  "typeReferences",
  "signatureTypes",
  "genericParams",

  "fullNames",
  "views",
  "viewStates",
  "calls",
] as const;

export type TableName = (typeof tableNames)[number];

type TableRowMap = {
  assemblies: Assemblies;
  namespaces: Namespaces;
  typeNames: TypeNames;
  members: Members;
  methodNames: MethodNames;
  typeReferences: TypeReferences;
  signatureTypes: SignatureTypes;
  genericParams: GenericParams;
  fullNames: FullNames;
  views: Views;
  viewStates: ViewStates;
  calls: Calls;
};

export type TableRow<K extends TableName> = TableRowMap[K];

export type Tables = { [K in TableName]: SqlTable<TableRow<K>> } & { close: () => void };

export const dropTables = (db: SqlDatabase) => tableNames.forEach((tableName) => db.dropTable(tableName));

const zero = {
  // number
  assemblyId: Id.castAssemblyId(0),
  namespaceId: Id.castNamespaceId(0),
  viewId: Id.castViewId(0),
  // bigint
  typeDefId: Id.castTypeDefId(0n),
  typeRefId: Id.castTypeRefId(0n),
  genericParamId: Id.castGenericParamId(0n),

  typeId: Id.castTypeRefId(0n),
  methodDefId: Id.castMethodDefId(0n),
  methodId: Id.castMethodDefId(0n),
  memberId: Id.castMemberId(0n),
  anyId: Id.castMAnyId(0n),
};

const row = {
  assemblies: { id: zero.assemblyId, name: "foo", isMicrosoft: 0 as Boolean },
  namespaces: { id: zero.namespaceId, name: "foo" },
  typeNames: { id: zero.typeDefId, name: "foo", namespace: zero.namespaceId, declaringType: zero.typeDefId },
  members: { id: zero.memberId, typeId: zero.typeDefId, name: "foo", json: {} as MembersJson },

  methodNames: { id: zero.methodDefId, name: "foo", returnType: zero.typeId },

  typeReferences: { id: zero.typeRefId, resolved: zero.typeDefId, suffix: "foo" },
  signatureTypes: { ownerId: zero.typeRefId, seqno: 0, argument: zero.typeId },
  genericParams: { id: zero.genericParamId, owner: zero.typeDefId, seqno: 0, name: "foo" },

  fullNames: { id: zero.anyId, fullName: "foo" },
  views: { id: zero.viewId, name: "foo", viewType: "assemblies" as ViewType },
  viewsStates: { id: zero.anyId, viewId: zero.viewId, isHidden: 0 as Boolean, isExpanded: 0 as Boolean },
  calls: { fromId: zero.methodId, toId: zero.methodId },
};

export const createTables = (db: SqlDatabase): Tables => {
  const assemblies = db.newSqlTable<Assemblies>("assemblies", "id", [], row.assemblies);
  const namespaces = db.newSqlTable<Namespaces>("namespaces", "id", [], row.namespaces);
  const typeNames = db.newSqlTable<TypeNames>("typeNames", "id", ["namespace", "declaringType"], row.typeNames);
  const members = db.newSqlTable<Members>("members", "id", [], row.members);
  const methodNames = db.newSqlTable<MethodNames>("methodNames", "id", [], row.methodNames);

  const typeReferences = db.newSqlTable<TypeReferences>("typeReferences", "id", ["suffix"], row.typeReferences);
  const signatureTypes = db.newSqlTable<SignatureTypes>("signatureTypes", ["ownerId", "seqno"], [], row.signatureTypes);
  const genericParams = db.newSqlTable<GenericParams>("genericParams", ["id", "seqno"], [], row.genericParams);

  const fullNames = db.newSqlTable<FullNames>("fullNames", "id", [], row.fullNames);
  const views = db.newSqlTable<Views>("views", "id", [], row.views);
  const viewStates = db.newSqlTable<ViewStates>("viewStates", "id", [], row.viewsStates);
  const calls = db.newSqlTable<Calls>("calls", "fromId", [], row.calls);

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
    signatureTypes,
    genericParams,
    fullNames,
    views,
    viewStates,
    calls,
    close,
  };
};
