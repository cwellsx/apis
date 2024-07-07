import { Database } from "better-sqlite3";
import type { MethodInfo } from "../../loaded";
import { SqlTable, dropTable } from "../sqlTable";
import {
  AssemblyColumns,
  CallColumns,
  CompilerMethodColumns,
  DeclaringTypeColumns,
  ErrorColumns,
  GraphFilterColumns,
  MemberColumns,
  MethodColumns,
  MethodNameColumns,
  TypeColumns,
  TypeNameColumns,
} from "./columns";
import type { SavedTypeInfo } from "./savedTypeInfo";

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
  declaringType: SqlTable<DeclaringTypeColumns>;
  compilerMethod: SqlTable<CompilerMethodColumns>;
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
    dropTable(db, "declaringType");
    dropTable(db, "compilerMethod");
  }

  const assembly = new SqlTable<AssemblyColumns>(db, "assembly", "assemblyName", () => false, {
    assemblyName: "foo",
    references: ["bar"],
  });
  const type = new SqlTable<TypeColumns>(db, "type", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    typeInfo: {} as SavedTypeInfo,
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
    methodInfo: {} as MethodInfo,
  });
  const error = new SqlTable<ErrorColumns>(db, "error", "assemblyName", () => false, {
    assemblyName: "foo",
    badTypeInfos: [],
    badMethodInfos: [],
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
    (key) => key === "namespace",
    {
      assemblyName: "foo",
      metadataToken: 0,
      namespace: "bar",
      decoratedName: "baz",
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
    nodeIds: [],
  });
  const declaringType = new SqlTable<DeclaringTypeColumns>(
    db,
    "declaringType",
    ["assemblyName", "nestedType"],
    () => false,
    {
      assemblyName: "references",
      nestedType: 0,
      declaringType: 0,
    }
  );
  const compilerMethod = new SqlTable<CompilerMethodColumns>(
    db,
    "compilerMethod",
    ["assemblyName", "compilerMethod"],
    (key) => key === "error" || key === "info" || key === "ownerNamespace",
    {
      assemblyName: "references",
      compilerType: 0,
      compilerMethod: 0,
      ownerType: 0,
      ownerNamespace: "foo",
      ownerMethod: 0,
      info: "baz",
      error: "No Callers",
    }
  );

  const deleteAll = (): void => {
    // delete in reverse order
    compilerMethod.deleteAll();
    declaringType.deleteAll();
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
    declaringType,
    compilerMethod,
  };
};
