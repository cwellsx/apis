import { SqlDatabase } from "sqlio";
import type {
  BadMethodInfoAndNames,
  BadTypeInfoAndNames,
  ClusterBy,
  CompilerMethod,
  ErrorsInfo,
  GraphFilter,
  LocalsType,
  MethodName,
  NodeId,
} from "../../shared-types";
import type {
  AnonTypeInfo,
  AssemblyReferences,
  BadMethodCall,
  GoodTypeInfo,
  MethodInfo,
  Reflected,
  TypeInfo,
} from "../loaded";
import { isAnonTypeInfo, loadedVersion, validateMethodInfo } from "../loaded";
import { log } from "../log";
import type { MethodNodeId, TypeNodeId } from "../nodeIds";
import { methodNodeId, toNameNodeId, toTypeNodeId, typeNodeId } from "../nodeIds";
import { mapOfMaps, options } from "../shared-types";
import type {
  Call,
  CallstackIterator,
  CommonGraphViewType,
  Direction,
  GetTypeOrMethodName,
  TypeAndMethodId,
} from "./sqlLoadedApiTypes";
import type {
  BadMethodInfoAndIds,
  BadTypeInfo,
  CallColumns,
  CompilerMethodColumns,
  MemberColumns,
  MethodColumns,
  NamedBadTypeInfo,
  SavedTypeInfo,
  TypeNameColumns,
} from "./sqlLoadedImpl";
import { compilerTransform, compilerTransformDisabled, getTypeAndMethodNames, newTables, save } from "./sqlLoadedImpl";

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
  readTypeInfos: (assemblyName: string) => TypeInfo[];
  readErrors: () => ErrorsInfo[];
  readCalls: (clusterBy: ClusterBy, expandedClusterNames: string[]) => Call[];

  readCallstack: (nodeId: MethodNodeId) => CallstackIterator;
  private readCallstackNext: (assemblyName: string, methodId: number, direction: Direction) => TypeAndMethodId[];
  private readCallstackFirst: (nodeId: MethodNodeId) => TypeAndMethodId;

  // reads data for DetailedMethod
  readMethodDetails: (nodeId: MethodNodeId) => { title: MethodName; asText: string; badMethodCalls?: BadMethodCall[] };
  // reads data for ViewCompiler
  readCompiler: () => { compilerMethods: CompilerMethod[]; localsTypes: LocalsType[] };

  // utility method
  readNames: () => GetTypeOrMethodName;
  private readMethodTypeId: (nodeId: MethodNodeId) => TypeNodeId;

  private readLeafVisible: (viewType: CommonGraphViewType) => NodeId[];
  private readGroupExpanded: (viewType: CommonGraphViewType, clusterBy: ClusterBy) => NodeId[];
  private writeLeafVisible: (viewType: CommonGraphViewType, leafVisible: NodeId[]) => void;
  private writeGroupExpanded: (viewType: CommonGraphViewType, clusterBy: ClusterBy, groupExpanded: NodeId[]) => void;
  readGraphFilter: (viewType: CommonGraphViewType, clusterBy: ClusterBy) => GraphFilter;
  writeGraphFilter: (viewType: CommonGraphViewType, clusterBy: ClusterBy, graphFilter: GraphFilter) => void;

  close: () => void;

  constructor(db: SqlDatabase) {
    const loadedSchemaVersionExpected = "2024-09-07";

    this.viewState = new ViewState(db);

    const schema = this.viewState.loadedSchemaVersion;
    const isSchemaChanged = schema !== loadedSchemaVersionExpected;

    const table = newTables(db, isSchemaChanged);

    if (isSchemaChanged) {
      this.viewState.loadedSchemaVersion = loadedSchemaVersionExpected;
      this.viewState.cachedWhen = ""; // force a reload of the data
    }

    this.save = (reflected: Reflected, when: string, hashDataSource: string) => {
      table.deleteAll();

      save(reflected, table);

      this.viewState.onSave(when, hashDataSource, reflected.version, reflected.exes, isSchemaChanged);

      this.writeLeafVisible(
        "references",
        Object.keys(reflected.assemblies).map((assemblyName) => toNameNodeId("assembly", assemblyName))
      );
      const assemblyTypeIds: NodeId[] = table.type
        .selectAll()
        .map((type) => toTypeNodeId(type.assemblyName, type.metadataToken));
      this.writeLeafVisible("apis", assemblyTypeIds);

      log("save complete");
      db.done();
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

    this.readTypeInfos = (assemblyName: string): TypeInfo[] => {
      const where = { assemblyName };

      // all the bad types are JSON in a single record
      const errors = table.error.selectWhere(where);
      const badTypeInfos: BadTypeInfo[] = errors.length > 0 ? errors[0].badTypeInfos : [];
      //const allTypeInfo = validateTypeInfo(badTypes);

      const anonTypeInfos: AnonTypeInfo[] = badTypeInfos.filter(isAnonTypeInfo);

      // all the good types are JSON in multiple records
      const savedTypes: SavedTypeInfo[] = table.type.selectWhere(where).map((columns) => columns.typeInfo);
      const goodTypeInfos: GoodTypeInfo[] = savedTypes.map((type) => ({ ...type, members: {} }));

      const goodTypeDictionary: GoodTypeDictionary = {};
      goodTypeInfos.forEach((type) => (goodTypeDictionary[type.typeId.metadataToken] = type));

      // all the members are saved separately
      // so read them from a different table and reinsert them into the GoodTypeInfo instances
      table.member.selectWhere(where).forEach((member) => {
        const type = goodTypeDictionary[member.typeMetadataToken];
        if (!type.members[member.memberType]) type.members[member.memberType] = [];
        type.members[member.memberType]?.push(JSON.parse(member.memberInfo));
      });

      return [...anonTypeInfos, ...goodTypeInfos];
    };

    this.readErrors = (): ErrorsInfo[] => {
      const { getTypeName, getMethodName } = this.readNames();

      const convertAnonTypeInfo = (badTypeInfo: BadTypeInfo): string[] =>
        (badTypeInfo.typeId ? undefined : badTypeInfo.exceptions) ?? [];

      const isNamedBadTypeInfo = (badTypeInfo: BadTypeInfo): badTypeInfo is NamedBadTypeInfo =>
        badTypeInfo.typeId !== undefined;

      const convertBadMethodInfo = (assemblyName: string, errorColumn: BadMethodInfoAndIds): BadMethodInfoAndNames => {
        return {
          ...errorColumn,
          methodMember: getMethodName(methodNodeId(assemblyName, errorColumn.methodId)),
          declaringType: getTypeName(typeNodeId(assemblyName, errorColumn.typeId)),
        };
      };

      const convertBadTypeInfo = (badTypeInfo: NamedBadTypeInfo): BadTypeInfoAndNames => ({
        typeName: getTypeName(typeNodeId(badTypeInfo.typeId.assemblyName, badTypeInfo.typeId.metadataToken)),
        exceptions: badTypeInfo.exceptions ?? [],
        memberExceptions:
          badTypeInfo.memberExceptions?.map((memberException) => ({
            exception: memberException.exception,
            memberName: memberException.name,
          })) ?? [],
      });

      return table.error.selectAll().map((errorColumns) => ({
        assemblyName: errorColumns.assemblyName,
        anonTypeInfos: errorColumns.badTypeInfos.flatMap(convertAnonTypeInfo),
        badTypeInfos: errorColumns.badTypeInfos.filter(isNamedBadTypeInfo).map(convertBadTypeInfo),
        badMethodInfos: errorColumns.badMethodInfos.map((badMethodInfo) =>
          convertBadMethodInfo(errorColumns.assemblyName, badMethodInfo)
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
      const calls: Call[] = result.map((callColumns) => ({
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
      if (options.showCompilerGeneratedTypes) return calls;
      const { filterCall } = compilerTransform(table.compilerMethod.selectAll());
      return calls.filter(filterCall);
    };

    this.readCallstack = (methodNodeId: MethodNodeId): CallstackIterator => {
      const first = this.readCallstackFirst(methodNodeId);

      const { isCompilerMethod, getOwner } = !options.showCompilerGeneratedTypes
        ? compilerTransform(table.compilerMethod.selectAll())
        : compilerTransformDisabled;

      const readNext = (assemblyName: string, methodId: number, direction: Direction): TypeAndMethodId[] => {
        const compilerMethods: TypeAndMethodId[] = [];
        const ordinaryMethods: TypeAndMethodId[] = [];
        const finishedMethods: TypeAndMethodId[] = [];

        // this is to avoid inifinite loop on recursive calls
        const isAlreadyFound = (newMethod: TypeAndMethodId, existing: TypeAndMethodId[]) =>
          existing.some(
            (found) => found.assemblyName === newMethod.assemblyName && found.methodId === newMethod.methodId
          );

        const filter = (result: TypeAndMethodId[]): void =>
          result.forEach((method) => {
            if (isCompilerMethod(method)) {
              if (!isAlreadyFound(method, finishedMethods)) compilerMethods.push(method);
            } else {
              if (!isAlreadyFound(method, ordinaryMethods)) ordinaryMethods.push(method);
            }
          });

        const readMore = (compilerMethods: TypeAndMethodId[]): TypeAndMethodId[] => {
          switch (direction) {
            case "downwards": {
              const results: TypeAndMethodId[] = [];
              compilerMethods.forEach((found) =>
                results.push(...this.readCallstackNext(found.assemblyName, found.methodId, direction))
              );
              return results;
            }
            case "upwards":
              return compilerMethods.map(getOwner);
          }
        };

        const first = this.readCallstackNext(assemblyName, methodId, direction);
        filter(first);
        while (compilerMethods.length !== 0) {
          const more = readMore(compilerMethods);
          finishedMethods.push(...compilerMethods);
          compilerMethods.length = 0;
          filter(more);
        }

        return ordinaryMethods;
      };
      return { first, readNext };
    };

    this.readCallstackNext = (assemblyName: string, methodId: number, direction: Direction): TypeAndMethodId[] => {
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

    this.readCallstackFirst = (methodNodeId: MethodNodeId): TypeAndMethodId => {
      const typeId = this.readMethodTypeId(methodNodeId);
      const { assemblyName, metadataToken } = typeId;
      const typeNamekey: Partial<TypeNameColumns> = { assemblyName, metadataToken };
      const typeNameColumns = table.typeName.selectOne(typeNamekey);
      if (!typeNameColumns) throw new Error(`Type not found ${JSON.stringify(typeNamekey)}`);

      return {
        assemblyName,
        // TODO check that namespace is correct when the type is nested
        namespace: typeNameColumns.namespace ?? "(no namespace)",
        methodId: methodNodeId.metadataToken,
        typeId: typeNameColumns.metadataToken,
      };
    };

    this.readNames = (): GetTypeOrMethodName => getTypeAndMethodNames(table);

    this.readMethodDetails = (
      methodNodeId: MethodNodeId
    ): { title: MethodName; asText: string; badMethodCalls?: BadMethodCall[] } => {
      // read one MethodInfo
      const readMethodInfo = (nodeId: MethodNodeId): MethodInfo => {
        const { assemblyName, metadataToken } = nodeId;
        const methodKey: Partial<MethodColumns> = { assemblyName, metadataToken };
        const method = table.method.selectOne(methodKey);
        if (!method) throw new Error(`Method details not found ${JSON.stringify(methodKey)}`);
        return method.methodInfo;
      };
      // should it really be this difficult to read a method name?
      const readMethodName = (nodeId: MethodNodeId): { methodName: string; typeName: string } => {
        const typeId = this.readMethodTypeId(nodeId);
        const { getTypeName, getMethodName } = this.readNames();
        return { methodName: getMethodName(methodNodeId), typeName: getTypeName(typeId) };
      };

      const methodInfo = readMethodInfo(methodNodeId);
      const { methodName, typeName } = readMethodName(methodNodeId);

      return {
        title: {
          assemblyName: methodNodeId.assemblyName,
          declaringType: typeName,
          methodMember: methodName,
        },
        asText: methodInfo.asText,
        badMethodCalls: validateMethodInfo(methodInfo).badMethodInfo?.badMethodCalls,
      };
    };

    this.readCompiler = (): { compilerMethods: CompilerMethod[]; localsTypes: LocalsType[] } => {
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

      const getCallstackFromDirection = (column: CompilerMethodColumns, direction: Direction): MethodName[] => {
        const { assemblyName, compilerType, compilerMethod } = column;
        const typeAndMethodIds = this.readCallstackNext(assemblyName, compilerMethod, direction);
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

      const getCallstackFromError = (column: CompilerMethodColumns): MethodName[] | undefined => {
        switch (column.error) {
          case null:
            return undefined;
          case "No Callers":
            return getCallstackFromDirection(column, "downwards");
          case "Multiple Callers":
            return getCallstackFromDirection(column, "upwards");
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
          callstack: getCallstackFromError(column),
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

    this.readMethodTypeId = (methodNodeId: MethodNodeId): TypeNodeId => {
      // use MemberColumns to get type Id
      const { assemblyName, metadataToken } = methodNodeId;
      const memberKey: Partial<MemberColumns> = { assemblyName, metadataToken };
      const member = table.member.selectOne(memberKey);
      if (!member) throw new Error(`Member not found ${JSON.stringify(memberKey)}`);
      return typeNodeId(assemblyName, member.typeMetadataToken);
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
      isCheckModelAll: false,
    });
    this.writeGraphFilter = (viewType: CommonGraphViewType, clusterBy: ClusterBy, graphFilter: GraphFilter): void => {
      this.writeLeafVisible(viewType, graphFilter.leafVisible);
      this.writeGroupExpanded(viewType, clusterBy, graphFilter.groupExpanded);
    };

    this.close = () => {
      db.done();
      db.close();
    };
  }
}
