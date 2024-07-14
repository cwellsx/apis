import { Database } from "better-sqlite3";
import type {
  BadMethodInfoAndNames,
  BadTypeInfoAndNames,
  ClusterBy,
  CompilerMethod,
  ErrorsInfo,
  GraphFilter,
  LocalsType,
  MethodNameStrings,
  MethodNodeId,
  NodeId,
  TypeNodeId,
} from "../../shared-types";
import { methodNodeId, nameNodeId, typeNodeId } from "../../shared-types";
import type { AllTypeInfo, AssemblyReferences, BadTypeInfo, GoodTypeInfo, MethodInfo, Reflected } from "../loaded";
import { isPartTypeInfo, loadedVersion, validateTypeInfo } from "../loaded";
import { log } from "../log";
import { mapOfMaps } from "../shared-types";
import type { Call, CommonGraphViewType, Direction, GetTypeOrMethodName, TypeAndMethodId } from "./sqlLoadedApiTypes";
import type {
  BadMethodInfoAndIds,
  CallColumns,
  MemberColumns,
  MethodColumns,
  MethodNameColumns,
  SavedTypeInfo,
  TypeNameColumns,
} from "./sqlLoadedImpl";
import { getTypeAndMethodNames, newTables, save } from "./sqlLoadedImpl";
import { CompilerMethodColumns } from "./sqlLoadedImpl/columns";
import { ViewState } from "./viewState";

/*
  SqlLoaded saves an instance of the Reflected type, which contains all TypeInfo and all MethodDetails, and which is:
  - Obtained from Core.exe via the electron-cgi connection
  - Saved into the SQLite tables
  - Reloaded into the application via various read methods

  Conversely the ViewState contains a cache-on-write, which the application reads from without selecting from SQLite.

  If in future the Reflected data is too large, rework the transfer to make it incremental e.g. one assembly at a time.

  These tables don't use WITHOUT ROWID because https://www.sqlite.org/withoutrowid.html#when_to_use_without_rowid
  says to do it when the rows are less than 50 bytes in size, however these tables contain serialized JSON columns.
*/

type GoodTypeDictionary = {
  [key: number]: GoodTypeInfo;
};

export class SqlLoaded {
  save: (reflected: Reflected, when: string, hashDataSource: string) => void;
  shouldReload: (when: string) => boolean;
  viewState: ViewState;
  readAssemblyReferences: () => AssemblyReferences;
  readTypes: (assemblyName: string) => AllTypeInfo;
  readErrors: () => ErrorsInfo[];
  readCalls: (clusterBy: ClusterBy, expandedClusterNames: string[]) => Call[];
  readCallStack: (assemblyName: string, methodId: number, direction: Direction) => TypeAndMethodId[];
  readMethods: (nodeId: MethodNodeId) => TypeAndMethodId[];
  readMethodInfo: (nodeId: MethodNodeId) => MethodInfo;
  readMethodName: (nodeId: MethodNodeId) => { methodName: string; typeName: string };
  readNames: () => GetTypeOrMethodName;
  readCompilerMethods: () => { compilerMethods: CompilerMethod[]; localsTypes: LocalsType[] };

  private readLeafVisible: (viewType: CommonGraphViewType) => NodeId[];
  private readGroupExpanded: (viewType: CommonGraphViewType, clusterBy: ClusterBy) => NodeId[];
  private writeLeafVisible: (viewType: CommonGraphViewType, leafVisible: NodeId[]) => void;
  private writeGroupExpanded: (viewType: CommonGraphViewType, clusterBy: ClusterBy, groupExpanded: NodeId[]) => void;
  readGraphFilter: (viewType: CommonGraphViewType, clusterBy: ClusterBy) => GraphFilter;
  writeGraphFilter: (viewType: CommonGraphViewType, clusterBy: ClusterBy, graphFilter: GraphFilter) => void;

  close: () => void;

  constructor(db: Database) {
    const loadedSchemaVersionExpected = "2024-07-13a";

    this.viewState = new ViewState(db);

    const schema = this.viewState.loadedSchemaVersion;
    const isSchemaChanged = schema !== loadedSchemaVersionExpected;

    const table = newTables(db, isSchemaChanged);

    if (isSchemaChanged) {
      this.viewState.loadedSchemaVersion = loadedSchemaVersionExpected;
      this.viewState.cachedWhen = ""; // force a reload of the data
    }
    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (reflected: Reflected, when: string, hashDataSource: string) => {
      table.deleteAll();

      save(reflected, table);

      this.viewState.onSave(when, hashDataSource, reflected.version, reflected.exes);

      this.writeLeafVisible(
        "references",
        Object.keys(reflected.assemblies).map((assemblyName) => nameNodeId("assembly", assemblyName))
      );
      const assemblyTypeIds: TypeNodeId[] = table.type
        .selectAll()
        .map((type) => typeNodeId(type.assemblyName, type.metadataToken));
      this.writeLeafVisible("apis", assemblyTypeIds);

      log("save complete");
      done();
      log("save done");
    };

    this.shouldReload = (when: string): boolean =>
      !this.viewState.cachedWhen ||
      loadedVersion !== this.viewState.loadedVersion ||
      Date.parse(this.viewState.cachedWhen) < Date.parse(when) ||
      loadedSchemaVersionExpected !== this.viewState.loadedSchemaVersion;

    this.readAssemblyReferences = () =>
      table.assembly.selectAll().reduce<AssemblyReferences>((found, entry) => {
        found[entry.assemblyName] = entry.references;
        return found;
      }, {});

    this.readTypes = (assemblyName: string): AllTypeInfo => {
      const where = { assemblyName };

      // all the bad types are JSON in a single record
      const errors = table.error.selectWhere(where);
      const badTypes: BadTypeInfo[] = errors.length > 0 ? errors[0].badTypeInfos : [];
      const allTypeInfo = validateTypeInfo(badTypes);

      // all the good types are JSON in multiple records
      const savedTypes: SavedTypeInfo[] = table.type.selectWhere(where).map((columns) => columns.typeInfo);
      allTypeInfo.good = savedTypes.map((type) => ({ ...type, members: {} }));

      const goodTypeDictionary: GoodTypeDictionary = {};
      allTypeInfo.good.forEach((type) => (goodTypeDictionary[type.typeId.metadataToken] = type));

      // all the members are saved separately
      // so read them from a different table and reinsert them into the GoodTypeInfo instances
      table.member.selectWhere(where).forEach((member) => {
        const type = goodTypeDictionary[member.typeMetadataToken];
        if (!type.members[member.memberType]) type.members[member.memberType] = [];
        type.members[member.memberType]?.push(JSON.parse(member.memberInfo));
      });

      return allTypeInfo;
    };

    this.readErrors = (): ErrorsInfo[] => {
      const { getTypeName, getMethodName } = this.readNames();
      const convert = (assemblyName: string, errorColumn: BadMethodInfoAndIds): BadMethodInfoAndNames => {
        return {
          ...errorColumn,
          methodMember: getMethodName(methodNodeId(assemblyName, errorColumn.methodId)),
          declaringType: getTypeName(typeNodeId(assemblyName, errorColumn.typeId)),
        };
      };
      const convertType = (badTypeInfo: BadTypeInfo): BadTypeInfoAndNames => {
        const typeName = isPartTypeInfo(badTypeInfo)
          ? getTypeName(typeNodeId(badTypeInfo.typeId.assemblyName, badTypeInfo.typeId.metadataToken))
          : undefined;
        return { typeName, exceptions: badTypeInfo.exceptions };
      };
      return table.error.selectAll().map((errorColumns) => ({
        assemblyName: errorColumns.assemblyName,
        badTypeInfos: errorColumns.badTypeInfos.map(convertType),
        badMethodInfos: errorColumns.badMethodInfos.map((badMethodInfo) =>
          convert(errorColumns.assemblyName, badMethodInfo)
        ),
      }));
    };

    this.readCalls = (clusterBy: ClusterBy, expandedClusterNames: string[]): Call[] => {
      const { fromName, toName } = (() => {
        switch (clusterBy) {
          case "assembly":
            return { fromName: "fromAssemblyName", toName: "toAssemblyName" };
          case "namespace":
            return { fromName: "fromNamespace", toName: "toNamespace" };
        }
      })();

      const result = table.call.selectCustom(true, `${fromName} != ${toName}`);
      expandedClusterNames.forEach((clusterName) =>
        result.push(
          ...table.call.selectCustom(true, `${fromName} == ${toName} AND ${fromName} == @clusterName`, {
            clusterName,
          })
        )
      );
      return result.map((callColumns) => ({
        from: {
          assemblyName: callColumns.fromAssemblyName,
          namespace: callColumns.fromNamespace,
          typeId: callColumns.fromTypeId,
          methodId: callColumns.fromMethodId,
        },
        to: {
          assemblyName: callColumns.toAssemblyName,
          namespace: callColumns.toNamespace,
          typeId: callColumns.toTypeId,
          methodId: callColumns.toMethodId,
        },
      }));
    };

    this.readCallStack = (assemblyName: string, methodId: number, direction: Direction): TypeAndMethodId[] => {
      const { assemblyNameField, methodIdField } = ((): {
        assemblyNameField: keyof CallColumns;
        methodIdField: keyof CallColumns;
      } => {
        switch (direction) {
          case "upwards":
            return { assemblyNameField: "toAssemblyName", methodIdField: "toMethodId" };
          case "downwards":
            return { assemblyNameField: "fromAssemblyName", methodIdField: "fromMethodId" };
        }
      })();

      const where: { [key in keyof Partial<CallColumns>]: string | number } = {};
      where[assemblyNameField] = assemblyName;
      where[methodIdField] = methodId;

      const rows = table.call.selectCustom(
        true,
        `${assemblyNameField} == @${assemblyNameField} AND ${methodIdField} == @${methodIdField}`,
        where
      );

      return rows.map((row) => {
        switch (direction) {
          case "upwards":
            return {
              assemblyName: row.fromAssemblyName,
              namespace: row.fromNamespace,
              typeId: row.fromTypeId,
              methodId: row.fromMethodId,
            };
          case "downwards":
            return {
              assemblyName: row.toAssemblyName,
              namespace: row.toNamespace,
              typeId: row.toTypeId,
              methodId: row.toMethodId,
            };
        }
      });
    };

    this.readMethods = (nodeId: MethodNodeId): TypeAndMethodId[] => {
      // use MemberColumns to get type Id
      const { assemblyName, metadataToken } = nodeId;
      const memberKey: Partial<MemberColumns> = { assemblyName, metadataToken };
      const member = table.member.selectOne(memberKey);
      if (!member) throw new Error(`Member not found ${JSON.stringify(memberKey)}`);

      const getTypeName = (typeMetadataToken: number): TypeNameColumns => {
        const typeNamekey: Partial<TypeNameColumns> = { assemblyName, metadataToken: typeMetadataToken };
        const typeName = table.typeName.selectOne(typeNamekey);
        if (!typeName) throw new Error(`Type not found ${JSON.stringify(typeNamekey)}`);
        return typeName;
      };

      const typeName = getTypeName(member.typeMetadataToken);

      return [
        {
          assemblyName,
          // TODO check that namespace is correct when the type is nested
          namespace: typeName.namespace ?? "(no namespace)",
          methodId: metadataToken,
          typeId: typeName.metadataToken,
        },
      ];
    };

    this.readMethodInfo = (nodeId: MethodNodeId): MethodInfo => {
      const { assemblyName, metadataToken } = nodeId;
      const methodKey: Partial<MethodColumns> = { assemblyName, metadataToken };
      const method = table.method.selectOne(methodKey);
      if (!method) throw new Error(`Method details not found ${JSON.stringify(methodKey)}`);
      return method.methodInfo;
    };

    this.readMethodName = (nodeId: MethodNodeId): { methodName: string; typeName: string } => {
      const typeAndMethodId = this.readMethods(nodeId)[0];
      const typeKey: Partial<TypeNameColumns> = {
        assemblyName: typeAndMethodId.assemblyName,
        metadataToken: typeAndMethodId.typeId,
      };
      const typeName = table.typeName.selectOne(typeKey);
      const methodKey: Partial<MethodNameColumns> = {
        assemblyName: typeAndMethodId.assemblyName,
        metadataToken: typeAndMethodId.methodId,
      };
      const methodName = table.methodName.selectOne(methodKey);
      if (!typeName) throw new Error(`Type name not found ${JSON.stringify(typeAndMethodId)}`);
      if (!methodName) throw new Error(`Method name not found ${JSON.stringify(typeAndMethodId)}`);
      return { methodName: methodName.name, typeName: typeName.decoratedName };
    };

    this.readNames = (): GetTypeOrMethodName => getTypeAndMethodNames(table);

    this.readCompilerMethods = (): { compilerMethods: CompilerMethod[]; localsTypes: LocalsType[] } => {
      const compilerMethodColumns = table.compilerMethod.selectAll();
      const localsTypeColumns = table.localsType.selectAll();

      const { getTypeName, getMethodName, getTypeNamespace } = this.readNames();

      const declaringTypes = table.declaringType.selectAll();
      const assemblyDeclaringTypes = mapOfMaps(
        declaringTypes.map((column) => [
          column.assemblyName,
          column.nestedType,
          typeNodeId(column.assemblyName, column.declaringType),
        ])
      );

      const getCallStackFromDirection = (column: CompilerMethodColumns, direction: Direction): MethodNameStrings[] => {
        const { assemblyName, compilerType, compilerMethod } = column;
        const typeAndMethodIds = this.readCallStack(assemblyName, compilerMethod, direction);
        const isSameType = (typeAndMethodId: TypeAndMethodId): boolean =>
          assemblyName === typeAndMethodId.assemblyName && compilerType === typeAndMethodId.typeId;
        return typeAndMethodIds
          .filter((found) => !isSameType(found))
          .map((typeAndMethodId) => ({
            assemblyName,
            declaringType: getTypeName(typeNodeId(assemblyName, typeAndMethodId.typeId)),
            methodMember: getMethodName(methodNodeId(assemblyName, typeAndMethodId.methodId)),
          }));
      };

      const getCallStackFromError = (column: CompilerMethodColumns): MethodNameStrings[] | undefined => {
        switch (column.error) {
          case null:
            return undefined;
          case "No Callers":
            return getCallStackFromDirection(column, "downwards");
          case "Multiple Callers":
            return getCallStackFromDirection(column, "upwards");
        }
      };

      const compilerMethods: CompilerMethod[] = compilerMethodColumns.map((column) => {
        // don't use getMapped which asserts a match is found
        // because there may be other compiler-generated types at assembly scope i.e. not nested inside a method
        const declaringType = assemblyDeclaringTypes.get(column.assemblyName)?.get(column.compilerType);
        const result: CompilerMethod = {
          assemblyName: column.assemblyName,
          compilerNamespace: getTypeNamespace(typeNodeId(column.assemblyName, column.compilerType)) ?? "(no namespace)",
          compilerType: getTypeName(typeNodeId(column.assemblyName, column.compilerType)),
          compilerMethod: getMethodName(methodNodeId(column.assemblyName, column.compilerMethod)),
          compilerTypeId: column.compilerType,
          compilerMethodId: column.compilerMethod,
          ownerNamespace: column.ownerNamespace ?? "(no namespace)",
          ownerType: column.ownerType ? getTypeName(typeNodeId(column.assemblyName, column.ownerType)) : "",
          ownerMethod: column.ownerMethod ? getMethodName(methodNodeId(column.assemblyName, column.ownerMethod)) : "",
          declaringType: declaringType ? getTypeName(declaringType) : "(no declaringType)",
          callStack: getCallStackFromError(column),
          error: column.error ?? undefined,
          info: column.info ?? undefined,
        };
        return result;
      });

      const localsTypes: LocalsType[] = localsTypeColumns.map((column) => ({
        assemblyName: column.assemblyName,
        ownerMethod: getMethodName(methodNodeId(column.assemblyName, column.ownerMethod)),
        ownerType: getTypeName(typeNodeId(column.assemblyName, column.ownerType)),
        compilerType: getTypeName(typeNodeId(column.assemblyName, column.compilerType)),
      }));

      compilerMethods.sort((x, y) => {
        let result = x.assemblyName.localeCompare(y.assemblyName);
        if (result) return result;
        result = x.ownerType.localeCompare(y.ownerType);
        if (result) return result;
        result = x.compilerType.localeCompare(y.compilerType);
        if (result) return result;
        result = x.compilerMethod.localeCompare(y.compilerMethod);
        return result;
      });
      return { compilerMethods, localsTypes };
    };

    this.readLeafVisible = (viewType: CommonGraphViewType): NodeId[] => {
      const found = table.graphFilter.selectOne({ viewType, clusterBy: "leafVisible" });
      if (!found) throw new Error("readLeafVisible nodes not found");
      return found.nodeIds;
    };
    this.readGroupExpanded = (viewType: CommonGraphViewType, clusterBy: ClusterBy): NodeId[] => {
      const found = table.graphFilter.selectOne({ viewType, clusterBy });
      return !found ? [] : found.nodeIds;
    };
    this.writeLeafVisible = (viewType: CommonGraphViewType, leafVisible: NodeId[]): void => {
      table.graphFilter.upsert({ viewType, clusterBy: "leafVisible", nodeIds: leafVisible });
    };
    this.writeGroupExpanded = (viewType: CommonGraphViewType, clusterBy: ClusterBy, groupExpanded: NodeId[]): void => {
      table.graphFilter.upsert({ viewType, clusterBy, nodeIds: groupExpanded });
    };
    this.readGraphFilter = (viewType: CommonGraphViewType, clusterBy: ClusterBy): GraphFilter => ({
      leafVisible: this.readLeafVisible(viewType),
      groupExpanded: this.readGroupExpanded(viewType, clusterBy),
    });
    this.writeGraphFilter = (viewType: CommonGraphViewType, clusterBy: ClusterBy, graphFilter: GraphFilter): void => {
      this.writeLeafVisible(viewType, graphFilter.leafVisible);
      this.writeGroupExpanded(viewType, clusterBy, graphFilter.groupExpanded);
    };

    this.close = () => {
      done();
      db.close();
    };
  }
}
