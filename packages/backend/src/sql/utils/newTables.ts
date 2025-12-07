import { SqlDatabase } from "sqlio";
import type { Columns, MethodInfo, SavedTypeInfo, Tables } from "../types";

export const newTables = (db: SqlDatabase, isSchemaChanged: boolean): Tables => {
  if (isSchemaChanged) {
    db.dropTable("assembly");
    db.dropTable("type");
    db.dropTable("member");
    db.dropTable("method");
    db.dropTable("error");
    db.dropTable("call");
    db.dropTable("typeName");
    db.dropTable("methodName");
    db.dropTable("graphFilter");
    db.dropTable("declaringType");
    db.dropTable("compilerMethod");
    db.dropTable("localsType");
  }

  const assembly = db.newSqlTable<Columns.AssemblyColumns>("assembly", "assemblyName", () => false, {
    assemblyName: "foo",
    references: ["bar"],
  });
  const type = db.newSqlTable<Columns.TypeColumns>("type", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    typeInfo: {} as SavedTypeInfo,
  });
  const member = db.newSqlTable<Columns.MemberColumns>("member", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    typeMetadataToken: 1,
    memberType: "methodMembers",
    memberInfo: "bat",
  });
  const method = db.newSqlTable<Columns.MethodColumns>("method", ["assemblyName", "metadataToken"], () => false, {
    assemblyName: "foo",
    metadataToken: 1,
    methodInfo: {} as MethodInfo,
  });
  const call = db.newSqlTable<Columns.CallColumns>(
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
  const typeName = db.newSqlTable<Columns.TypeNameColumns>(
    "typeName",
    ["assemblyName", "metadataToken"],
    (key) => key === "namespace",
    { assemblyName: "foo", metadataToken: 0, namespace: "bar", decoratedName: "baz", isCompilerType: 0 }
  );
  const methodName = db.newSqlTable<Columns.MethodNameColumns>(
    "methodName",
    ["assemblyName", "metadataToken"],
    () => false,
    { assemblyName: "foo", metadataToken: 0, name: "bar", isCompilerMethod: 0 }
  );
  const graphFilter = db.newSqlTable<Columns.GraphFilterColumns>(
    "graphFilter",
    ["viewType", "clusterBy"],
    () => false,
    { viewType: "references", clusterBy: "assembly", nodeIds: [] }
  );
  const declaringType = db.newSqlTable<Columns.DeclaringTypeColumns>(
    "declaringType",
    ["assemblyName", "nestedType"],
    () => false,
    { assemblyName: "references", nestedType: 0, declaringType: 0 }
  );
  const compilerMethod = db.newSqlTable<Columns.CompilerMethodColumns>(
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
  const localsType = db.newSqlTable<Columns.LocalsTypeColumns>(
    "localsType",
    ["assemblyName", "ownerMethod", "compilerType"],
    (/* key */) => false,
    { assemblyName: "references", ownerType: 0, ownerNamespace: "foo", ownerMethod: 0, compilerType: 0 }
  );

  const deleteAll = (): void => {
    // delete in reverse order
    localsType.deleteAll();
    compilerMethod.deleteAll();
    declaringType.deleteAll();
    graphFilter.deleteAll();
    methodName.deleteAll();
    typeName.deleteAll();
    call.deleteAll();
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
    call,
    typeName,
    methodName,
    graphFilter,
    declaringType,
    compilerMethod,
    localsType,
  };
};
