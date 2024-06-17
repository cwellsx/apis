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
  TypeColumns,
  TypeNameColumns,
} from "./columns";

export const tables = (db: Database) => {
  const assemblyTable = new SqlTable<AssemblyColumns>(db, "assembly", "assemblyName", () => false, {
    assemblyName: "foo",
    references: "bar",
  });
  const typeTable = new SqlTable<TypeColumns>(db, "type", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    typeInfo: "bar",
  });
  const memberTable = new SqlTable<MemberColumns>(db, "member", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    typeMetadataToken: 1,
    memberType: "methodMembers",
    memberInfo: "bat",
  });
  const methodTable = new SqlTable<MethodColumns>(db, "method", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    methodDetails: "bar",
  });
  const errorTable = new SqlTable<ErrorColumns>(db, "error", "assemblyName", () => false, {
    assemblyName: "foo",
    badTypeInfos: "bar",
    badCallDetails: "baz",
  });
  const callTable = new SqlTable<CallColumns>(
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
  const typeNameTable = new SqlTable<TypeNameColumns>(
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
  const methodNameTable = new SqlTable<MethodNameColumns>(
    db,
    "methodName",
    ["assemblyName", "metadataToken"],
    () => false,
    {
      assemblyName: "foo",
      metadataToken: 0,
      name: "bar",
    }
  );
  const graphFilterTable = new SqlTable<GraphFilterColumns>(db, "graphFilter", ["viewType", "clusterBy"], () => false, {
    viewType: "references",
    clusterBy: "assembly",
    value: "baz",
  });

  const dropTables = (): void => {
    dropTable(db, "assembly");
    dropTable(db, "type");
    dropTable(db, "member");
    dropTable(db, "method");
    dropTable(db, "error");
    dropTable(db, "call");
    dropTable(db, "typeName");
    dropTable(db, "methodName");
    dropTable(db, "graphFilter");
  };

  const deleteTables = (): void => {
    // delete in reverse order
    graphFilterTable.deleteAll();
    methodNameTable.deleteAll();
    typeNameTable.deleteAll();
    callTable.deleteAll();
    errorTable.deleteAll();
    methodTable.deleteAll();
    memberTable.deleteAll();
    typeTable.deleteAll();
    assemblyTable.deleteAll();
  };

  return {
    dropTables,
    deleteTables,
    assemblyTable,
    typeTable,
    memberTable,
    methodTable,
    errorTable,
    callTable,
    typeNameTable,
    methodNameTable,
    graphFilterTable,
  };
};
