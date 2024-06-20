import { Database } from "better-sqlite3";
import { SqlTable, dropTable } from "../sqlTable";
import {
  AssemblyColumns,
  CallColumns,
  ErrorColumns,
  GraphFilterColumns,
  MemberColumns,
  MethodColumns,
  MethodNameColumns,
  NestedTypeColumns,
  TypeColumns,
  TypeNameColumns,
} from "./columns";

export type Tables = {
  assembly: SqlTable<AssemblyColumns>;
  type: SqlTable<TypeColumns>;
  member: SqlTable<MemberColumns>;
  method: SqlTable<MethodColumns>;
  error: SqlTable<ErrorColumns>;
  call: SqlTable<CallColumns>;
  typeName: SqlTable<TypeNameColumns>;
  methodName: SqlTable<MethodNameColumns>;
  graphFilter: SqlTable<GraphFilterColumns>;
  nestedType: SqlTable<NestedTypeColumns>;
  deleteAll: () => void;
};

export const newTables = (db: Database, isSchemaChanged: boolean): Tables => {
  if (isSchemaChanged) {
    dropTable(db, "assembly");
    dropTable(db, "type");
    dropTable(db, "member");
    dropTable(db, "method");
    dropTable(db, "error");
    dropTable(db, "call");
    dropTable(db, "typeName");
    dropTable(db, "methodName");
    dropTable(db, "graphFilter");
    dropTable(db, "nestedType");
  }

  const assembly = new SqlTable<AssemblyColumns>(db, "assembly", "assemblyName", () => false, {
    assemblyName: "foo",
    references: "bar",
  });
  const type = new SqlTable<TypeColumns>(db, "type", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    typeInfo: "bar",
  });
  const member = new SqlTable<MemberColumns>(db, "member", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    typeMetadataToken: 1,
    memberType: "methodMembers",
    memberInfo: "bat",
  });
  const method = new SqlTable<MethodColumns>(db, "method", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    methodDetails: "bar",
  });
  const error = new SqlTable<ErrorColumns>(db, "error", "assemblyName", () => false, {
    assemblyName: "foo",
    badTypeInfos: "bar",
    badCallDetails: "baz",
  });
  const call = new SqlTable<CallColumns>(
    db,
    "call",
    ["fromAssemblyName", "fromMethodId", "toAssemblyName", "toMethodId"],
    () => false,
    {
      fromAssemblyName: "foo",
      fromNamespace: "bar",
      fromTypeId: 0,
      fromMethodId: 0,
      toAssemblyName: "baz",
      toNamespace: "bat",
      toTypeId: 0,
      toMethodId: 0,
    }
  );
  const typeName = new SqlTable<TypeNameColumns>(
    db,
    "typeName",
    ["assemblyName", "metadataToken"],
    (key) => key === "namespace" || key === "wantedTypeId",
    {
      assemblyName: "foo",
      metadataToken: 0,
      namespace: "bar",
      decoratedName: "baz",
      wantedTypeId: 0,
    }
  );
  const methodName = new SqlTable<MethodNameColumns>(db, "methodName", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 0,
    name: "bar",
  });
  const graphFilter = new SqlTable<GraphFilterColumns>(db, "graphFilter", ["viewType", "clusterBy"], () => false, {
    viewType: "references",
    clusterBy: "assembly",
    value: "baz",
  });
  const nestedType = new SqlTable<NestedTypeColumns>(db, "nestedType", ["assemblyName", "nestedType"], () => false, {
    assemblyName: "references",
    nestedType: 0,
    declaringType: 0,
    declaringMethod: 0,
  });

  const deleteAll = (): void => {
    // delete in reverse order
    nestedType.deleteAll();
    graphFilter.deleteAll();
    methodName.deleteAll();
    typeName.deleteAll();
    call.deleteAll();
    error.deleteAll();
    method.deleteAll();
    member.deleteAll();
    type.deleteAll();
    assembly.deleteAll();
  };

  return {
    deleteAll,
    assembly,
    type,
    member,
    method,
    error,
    call,
    typeName,
    methodName,
    graphFilter,
    nestedType,
  };
};
