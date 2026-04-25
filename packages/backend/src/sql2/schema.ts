import { SqlDatabase, SqlTable } from "sqlio";
import * as DotNet from "../../contracts/dotnet2";
import type { AnyId, AssemblyId, MemberId, MethodId, NamespaceId, TypeDefId, ViewId } from "./bigIds";
import * as BigId from "./bigIds";

export type Boolean = 0 | 1;
export type ViewType = "assemblies" | "namespaces";

// properties except name and metadataToken of "members" types are stored as JSON
export type NameAndMetadataToken = { name: string; metadataToken: DotNet.MetadataToken };
export type WithoutNameAndMetadataToken<T> = Omit<T, "name" | "metadataToken">;
export type AnyDotNetMembers = DotNet.FieldMember | DotNet.EventMember | DotNet.PropertyMember | DotNet.MethodMember;
export type MembersJson = WithoutNameAndMetadataToken<AnyDotNetMembers>;

export type Assemblies = { id: AssemblyId; name: string; isMicrosoft: Boolean };
export type Namespaces = { id: NamespaceId; name: string };
export type TypeInfos = { id: TypeDefId; namespace?: NamespaceId; name: string; declaringType?: TypeDefId };
export type Members = { id: MemberId; typeId: TypeDefId; name: string; json: MembersJson };
export type FullNames = { id: AnyId; fullName: string };

export type Views = { id: ViewId; name: string; viewType: ViewType };
export type ViewStates = { viewId: ViewId; id: AnyId; isHidden: Boolean; isExpanded: Boolean };

export type Calls = { fromId: MethodId; toId: MethodId };

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

const zero = {
  // number
  assemblyId: BigId.castAssemblyId(0),
  namespaceId: BigId.castNamespaceId(0),
  viewId: BigId.castViewId(0),
  // bigint
  typeDefId: BigId.castTypeDefId(0n),
  methodId: BigId.castMethodId(0n),
  memberId: BigId.castMemberId(0n),
  anyId: BigId.castMAnyId(0n),
};

const row = {
  assemblies: { id: zero.assemblyId, name: "foo", isMicrosoft: 0 as Boolean },
  namespaces: { id: zero.namespaceId, name: "foo" },
  typeInfos: { id: zero.typeDefId, name: "foo", namespace: zero.namespaceId, declaringType: zero.typeDefId },
  members: { id: zero.memberId, typeId: zero.typeDefId, name: "foo", json: {} as MembersJson },
  fullNames: { id: zero.anyId, fullName: "foo" },
  views: { id: zero.viewId, name: "foo", viewType: "assemblies" as ViewType },
  viewsStates: { id: zero.anyId, viewId: zero.viewId, isHidden: 0 as Boolean, isExpanded: 0 as Boolean },
  calls: { fromId: zero.methodId, toId: zero.methodId },
};

export const createTables = (db: SqlDatabase): Tables => {
  const assemblies = db.newSqlTable<Assemblies>("assemblies", "id", [], row.assemblies);
  const namespaces = db.newSqlTable<Namespaces>("namespaces", "id", [], row.namespaces);
  const typeInfos = db.newSqlTable<TypeInfos>("typeInfos", "id", ["namespace", "declaringType"], row.typeInfos);
  const members = db.newSqlTable<Members>("members", "id", [], row.members);
  const fullNames = db.newSqlTable<FullNames>("fullNames", "id", [], row.fullNames);
  const views = db.newSqlTable<Views>("views", "id", [], row.views);
  const viewStates = db.newSqlTable<ViewStates>("viewStates", "id", [], row.viewsStates);
  const calls = db.newSqlTable<Calls>("calls", "fromId", [], row.calls);

  const close = () => {
    db.done();
    db.close();
  };

  return { assemblies, namespaces, typeInfos, members, fullNames, views, viewStates, calls, close };
};
