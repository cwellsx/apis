import { Database } from "better-sqlite3";
import type {
  ClusterBy,
  CommonGraphViewType,
  ErrorsInfo,
  GraphFilter,
  MethodNodeId,
  NodeId,
  TypeNodeId,
} from "../../shared-types";
import { nameNodeId, typeNodeId } from "../../shared-types";
import type { AllTypeInfo, AssemblyReferences, BadTypeInfo, GoodTypeInfo, MethodDetails, Reflected } from "../loaded";
import { loadedVersion, validateTypeInfo } from "../loaded";
import { badTypeInfo } from "../loaded/loadedTypeInfo";
import { log } from "../log";
import type { Call, Direction, GetTypeOrMethodName, TypeAndMethodId } from "../shared-types";
import { getTypeAndMethodNames, nestTypes } from "../shared-types";
import { uniqueStrings } from "../shared-types/remove";
import type {
  CallColumns,
  ErrorColumns,
  MemberColumns,
  MethodColumns,
  MethodNameColumns,
  SavedTypeInfo,
  TypeNameColumns,
} from "./sqlLoadedImpl";
import { saveGoodTypeInfo, saveMethodDictionary, tables } from "./sqlLoadedImpl";
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
  readMethodDetails: (nodeId: MethodNodeId) => MethodDetails;
  readMethodName: (nodeId: MethodNodeId) => { methodName: string; typeName: string };
  readNames: () => GetTypeOrMethodName;

  private readLeafVisible: (viewType: CommonGraphViewType) => NodeId[];
  private readGroupExpanded: (viewType: CommonGraphViewType, clusterBy: ClusterBy) => NodeId[];
  private writeLeafVisible: (viewType: CommonGraphViewType, leafVisible: NodeId[]) => void;
  private writeGroupExpanded: (viewType: CommonGraphViewType, clusterBy: ClusterBy, groupExpanded: NodeId[]) => void;
  readGraphFilter: (viewType: CommonGraphViewType, clusterBy: ClusterBy) => GraphFilter;
  writeGraphFilter: (viewType: CommonGraphViewType, clusterBy: ClusterBy, graphFilter: GraphFilter) => void;

  close: () => void;

  constructor(db: Database) {
    const loadedSchemaVersionExpected = "2024-06-18";

    this.viewState = new ViewState(db);

    const schema = this.viewState.loadedSchemaVersion;
    const isSchemaChanged = schema !== loadedSchemaVersionExpected;

    const {
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
      nestedTypeTable,
    } = tables(db, isSchemaChanged);

    if (isSchemaChanged) {
      this.viewState.loadedSchemaVersion = loadedSchemaVersionExpected;
      this.viewState.cachedWhen = ""; // force a reload of the data
    }
    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (reflected: Reflected, when: string, hashDataSource: string) => {
      // delete in reverse order
      deleteTables();

      log("save reflected.assemblies");

      // map methodId to typeId
      // { [assemblyName: string]: { [methodId: number]: number } } = {};
      const assemblyMethodTypes = new Map<string, Map<number, number>>();

      // map typeId to TypeNameColumns
      // { [assemblyName: string]: { [typeId: number]: TypeNameColumns } } = {};
      const assemblyTypeNames = new Map<string, Map<number, TypeNameColumns>>();

      // map nestedTypeId to declaringType
      // { [assemblyName: string]: { [nestedTypeId: number]: number } } = {};
      const assemblyNestedTypes = new Map<string, Map<number, number>>();

      const assemblyTypeIds: TypeNodeId[] = [];

      for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
        const allTypeInfo = validateTypeInfo(assemblyInfo.types);

        // BadTypeInfo[]
        const bad = badTypeInfo(allTypeInfo);
        if (bad.length) {
          errorTable.insert({ assemblyName, badTypeInfos: JSON.stringify(bad), badCallDetails: JSON.stringify([]) });
        }

        // GoodTypeInfo[]
        const { typeColumns, memberColumns, methodNameColumns, typeNameColumns } = saveGoodTypeInfo(
          assemblyName,
          allTypeInfo.good
        );

        // update the two Maps

        const methodTypes = new Map<number, number>(
          memberColumns
            .filter((member) => member.memberType === "methodMembers")
            .map((member) => [member.metadataToken, member.typeMetadataToken])
        );
        assemblyMethodTypes.set(assemblyName, methodTypes);

        const typeNames = new Map<number, TypeNameColumns>(typeNameColumns.map((it) => [it.metadataToken, it]));
        assemblyTypeNames.set(assemblyName, typeNames);

        // update the tables

        // => assemblyTable
        assemblyTable.insert({
          assemblyName,
          // uniqueStrings because I've unusually seen an assembly return two references to the same assembly name
          references: JSON.stringify(uniqueStrings(assemblyInfo.referencedAssemblies)),
        });
        // => typeNameTable
        typeNameTable.insertMany(typeNameColumns);
        // => typeTable
        typeTable.insertMany(typeColumns);
        // => memberTable
        memberTable.insertMany(memberColumns);
        // => methodNameTable
        methodNameTable.insertMany(methodNameColumns);

        assemblyTypeIds.push(...typeColumns.map((it) => typeNodeId(assemblyName, it.metadataToken)));

        const { unwantedTypes } = nestTypes(allTypeInfo.good);
        assemblyNestedTypes.set(
          assemblyName,
          new Map<number, number>(Object.entries(unwantedTypes).map(([key, value]) => [+key, value]))
        );
      }

      log("save reflected.assemblyMethods");

      // [assemblyName: string]: { [methodId: number]: { assemblyName: string; methodId: number }[] };
      const assemblyCalls = new Map<string, Map<number, { assemblyName: string; methodId: number }[]>>();

      for (const [assemblyName, methodDictionary] of Object.entries(reflected.assemblyMethods)) {
        const { methodCalls, methods, badCallDetails } = saveMethodDictionary(assemblyName, methodDictionary);

        assemblyCalls.set(assemblyName, new Map<number, { assemblyName: string; methodId: number }[]>(methodCalls));

        // => errorsTable
        if (badCallDetails.length) {
          const found = errorTable.selectOne({ assemblyName });
          const columns: ErrorColumns = {
            assemblyName,
            badTypeInfos: found?.badTypeInfos ?? JSON.stringify([]),
            badCallDetails: JSON.stringify(badCallDetails),
          };
          if (found) errorTable.update(columns);
          else errorTable.insert(columns);
        }

        // => methodTable
        methodTable.insertMany(methods);
      }

      const getTypeId = (assemblyName: string, methodId: number): { namespace: string; typeId: number } => {
        // get typeId from methodId
        const typeId = assemblyMethodTypes.get(assemblyName)?.get(methodId);
        if (!typeId) throw new Error("typeId not found");
        // get namespace and wantedTypeId from typeId
        const found = assemblyTypeNames.get(assemblyName)?.get(typeId);
        if (!found) throw new Error("typeName not found");
        return {
          namespace: found.namespace ?? "(no namespace)",
          typeId: found.wantedTypeId ?? found.metadataToken,
        };
      };

      const callColumns: CallColumns[] = [];
      [...assemblyCalls.entries()].forEach(([assemblyName, methodCalls]) =>
        [...methodCalls.entries()].forEach(([key, calls]) => {
          const methodId = +key;
          const { namespace: fromNamespace, typeId: fromTypeId } = getTypeId(assemblyName, methodId);
          calls.forEach((called) => {
            const { namespace: toNamespace, typeId: toTypeId } = getTypeId(called.assemblyName, called.methodId);
            callColumns.push({
              fromAssemblyName: assemblyName,
              fromNamespace,
              fromTypeId,
              fromMethodId: methodId,
              toAssemblyName: called.assemblyName,
              toNamespace,
              toTypeId,
              toMethodId: called.methodId,
            });
          });
        })
      );

      callTable.insertMany(callColumns);

      // const { nestedTypeColumns, errors } = saveNestedTypes(assemblyCalls, assemblyNestedTypes, assemblyMethodTypes);
      // nestedTypeTable.insertMany(nestedTypeColumns);

      // => viewState => _cache => _sqlConfig
      this.viewState.onSave(when, hashDataSource, reflected.version, reflected.exes);

      this.writeLeafVisible(
        "references",
        Object.keys(reflected.assemblies).map((assemblyName) => nameNodeId("assembly", assemblyName))
      );
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
      assemblyTable.selectAll().reduce<AssemblyReferences>((found, entry) => {
        found[entry.assemblyName] = JSON.parse(entry.references);
        return found;
      }, {});

    this.readTypes = (assemblyName: string): AllTypeInfo => {
      const where = { assemblyName };

      // all the bad types are JSON in a single record
      const errors = errorTable.selectWhere(where);
      const badTypes: BadTypeInfo[] = errors.length > 0 ? JSON.parse(errors[0].badTypeInfos) : [];
      const allTypeInfo = validateTypeInfo(badTypes);

      // all the good types are JSON in multiple records
      const savedTypes: SavedTypeInfo[] = typeTable.selectWhere(where).map((columns) => JSON.parse(columns.typeInfo));
      allTypeInfo.good = savedTypes.map((type) => ({ ...type, members: {} }));

      const goodTypeDictionary: GoodTypeDictionary = {};
      allTypeInfo.good.forEach((type) => (goodTypeDictionary[type.typeId.metadataToken] = type));

      // all the members are saved separately
      // so read them from a different table and reinsert them into the GoodTypeInfo instances
      memberTable.selectWhere(where).forEach((member) => {
        const type = goodTypeDictionary[member.typeMetadataToken];
        if (!type.members[member.memberType]) type.members[member.memberType] = [];
        type.members[member.memberType]?.push(JSON.parse(member.memberInfo));
      });

      return allTypeInfo;
    };

    this.readErrors = (): ErrorsInfo[] =>
      errorTable.selectAll().map((errorColumns) => ({
        assemblyName: errorColumns.assemblyName,
        badTypeInfos: JSON.parse(errorColumns.badTypeInfos),
        badCallDetails: JSON.parse(errorColumns.badCallDetails),
      }));

    this.readCalls = (clusterBy: ClusterBy, expandedClusterNames: string[]): Call[] => {
      const { fromName, toName } = (() => {
        switch (clusterBy) {
          case "assembly":
            return { fromName: "fromAssemblyName", toName: "toAssemblyName" };
          case "namespace":
            return { fromName: "fromNamespace", toName: "toNamespace" };
        }
      })();

      const result = callTable.selectCustom(true, `${fromName} != ${toName}`);
      expandedClusterNames.forEach((clusterName) =>
        result.push(
          ...callTable.selectCustom(true, `${fromName} == ${toName} AND ${fromName} == @clusterName`, {
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

      const rows = callTable.selectCustom(
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
      const member = memberTable.selectOne(memberKey);
      if (!member) throw new Error(`Member not found ${JSON.stringify(memberKey)}`);

      const getTypeName = (typeMetadataToken: number): TypeNameColumns => {
        const typeNamekey: Partial<TypeNameColumns> = { assemblyName, metadataToken: typeMetadataToken };
        const typeName = typeNameTable.selectOne(typeNamekey);
        if (!typeName) throw new Error(`Type not found ${JSON.stringify(typeNamekey)}`);
        return typeName;
      };

      let typeName = getTypeName(member.typeMetadataToken);
      // if we want a different type then get it again to get the right namespace
      if (typeName.wantedTypeId) typeName = getTypeName(typeName.wantedTypeId);
      if (typeName.wantedTypeId) throw new Error(`Wanted type defines a wantedTypeId of its own`);

      return [
        {
          assemblyName,
          namespace: typeName.namespace ?? "(no namespace)",
          methodId: metadataToken,
          typeId: typeName.metadataToken,
        },
      ];
    };

    this.readMethodDetails = (nodeId: MethodNodeId): MethodDetails => {
      const { assemblyName, metadataToken } = nodeId;
      const methodKey: Partial<MethodColumns> = { assemblyName, metadataToken };
      const method = methodTable.selectOne(methodKey);
      if (!method) throw new Error(`Method details not found ${JSON.stringify(methodKey)}`);
      return JSON.parse(method.methodDetails) as MethodDetails;
    };

    this.readMethodName = (nodeId: MethodNodeId): { methodName: string; typeName: string } => {
      const typeAndMethodId = this.readMethods(nodeId)[0];
      const typeKey: Partial<TypeNameColumns> = {
        assemblyName: typeAndMethodId.assemblyName,
        metadataToken: typeAndMethodId.typeId,
      };
      const typeName = typeNameTable.selectOne(typeKey);
      const methodKey: Partial<MethodNameColumns> = {
        assemblyName: typeAndMethodId.assemblyName,
        metadataToken: typeAndMethodId.methodId,
      };
      const methodName = methodNameTable.selectOne(methodKey);
      if (!typeName) throw new Error(`Type name not found ${JSON.stringify(typeAndMethodId)}`);
      if (!methodName) throw new Error(`Method name not found ${JSON.stringify(typeAndMethodId)}`);
      return { methodName: methodName.name, typeName: typeName.decoratedName };
    };

    this.readNames = (): GetTypeOrMethodName => {
      const typeNames = typeNameTable.selectAll();
      const methodNames = methodNameTable.selectAll();
      return getTypeAndMethodNames(
        typeNames.map((typeNameColumns) => ({
          assemblyName: typeNameColumns.assemblyName,
          metadataToken: typeNameColumns.metadataToken,
          name: typeNameColumns.decoratedName,
        })),
        methodNames.map((methodNameColumns) => ({
          assemblyName: methodNameColumns.assemblyName,
          metadataToken: methodNameColumns.metadataToken,
          name: methodNameColumns.name,
        }))
      );
    };

    this.readLeafVisible = (viewType: CommonGraphViewType): NodeId[] => {
      const found = graphFilterTable.selectOne({ viewType, clusterBy: "leafVisible" });
      if (!found) throw new Error("readLeafVisible nodes not found");
      return JSON.parse(found.value);
    };
    this.readGroupExpanded = (viewType: CommonGraphViewType, clusterBy: ClusterBy): NodeId[] => {
      const found = graphFilterTable.selectOne({ viewType, clusterBy });
      return !found ? [] : JSON.parse(found.value);
    };
    this.writeLeafVisible = (viewType: CommonGraphViewType, leafVisible: NodeId[]): void => {
      graphFilterTable.upsert({ viewType, clusterBy: "leafVisible", value: JSON.stringify(leafVisible) });
    };
    this.writeGroupExpanded = (viewType: CommonGraphViewType, clusterBy: ClusterBy, groupExpanded: NodeId[]): void => {
      graphFilterTable.upsert({ viewType, clusterBy, value: JSON.stringify(groupExpanded) });
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
