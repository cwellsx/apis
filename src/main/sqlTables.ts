import { Database } from "better-sqlite3";
import type {
  ApiViewOptions,
  AppOptions,
  ClusterBy,
  CommonGraphViewType,
  CustomError,
  CustomViewOptions,
  ErrorsInfo,
  GraphFilter,
  Members,
  MethodViewOptions,
  NodeId,
  ReferenceViewOptions,
  TypeNodeId,
  ViewType,
} from "../shared-types";
import { defaultAppOptions, methodNodeId, nameNodeId, typeNodeId } from "../shared-types";
import { isAnyOtherCustomField, type CustomNode } from "./customJson";
import type {
  AllTypeInfo,
  AssemblyReferences,
  BadCallDetails,
  BadTypeInfo,
  GoodTypeInfo,
  MethodDetails,
  MethodMember,
  Reflected,
} from "./loaded";
import { badTypeInfo, isBadCallDetails, isGoodCallDetails, loadedVersion, validateTypeInfo } from "./loaded";
import { log } from "./log";
import { TypeAndMethodDetails, distinctor, getTypeInfoName, nestTypes } from "./shared-types";
import { uniqueStrings } from "./shared-types/remove";
import { createSqlDatabase } from "./sqlDatabase";
import { SqlTable, dropTable } from "./sqlTable";

//export type ErrorsInfo = { assemblyName: string; badTypeInfos: BadTypeInfo[]; badCallDetails: BadCallDetails[] };

/*
  This defines all SQLite tables used by the application, include the record format and the methods to access them
  They're all in this one source file, because their implementations are similar

  - SqlLoaded is implemented using
    - SqlTable<AssemblyColumns>
    - SqlTable<TypeColumns>
    - SqlTable<MemberColumns>
    - SqlTable<MethodColumns>
    - SqlTable<ErrorsColumns>
    - SqlTable<CallsColumns>
    - ViewState i.e. ConfigCache
  
  - SqlConfig is implemented using
    - SqlTable<RecentColumns>
    - ConfigCache i.e. SqlConfigTable plus a values cache
  
  - SqlConfigTable is implemented using
    - SqlTable<ConfigColumns>
  
  SqlLoaded saves an instance of the Reflected type, which contains all TypeInfo and all MethodDetails, and which is:
  - Obtained from Core.exe via the electron-cgi connection
  - Saved into the SQLite tables
  - Reloaded into the application via various read methods

  Conversely the ViewState contains a cache-on-write, which the application reads from without selecting from SQLite.

  If in future the Reflected data is too large, rework the transfer to make it incremental e.g. one assembly at a time.

  A future refactoring could remove the column definitions to another module, e.g. sqlColumns.ts could define and export
  the *Columns types, with corresponding load* and save* methods to wrap JSON and convert to and from application types.

  These tables don't use WITHOUT ROWID because https://www.sqlite.org/withoutrowid.html#when_to_use_without_rowid
  says to do it when the rows are less than 50 bytes in size, however these tables contain serialized JSON columns.
*/

type AssemblyColumns = {
  assemblyName: string;
  // JSON-encoded array of names of referenced assemblies
  references: string;
};

type TypeColumns = {
  assemblyName: string;
  metadataToken: number; // Id of Type within assembly
  typeInfo: string;
};

type MemberColumns = {
  // each record contains MethodDetails for a single method, application reads several methods at a time
  assemblyName: string;
  metadataToken: number;
  typeMetadataToken: number;
  memberType: keyof Members;
  memberInfo: string;
};

type MethodColumns = {
  // each record contains MethodDetails for a single method, application reads several methods at a time
  assemblyName: string;
  metadataToken: number;
  methodDetails: string;
};

type ErrorColumns = {
  assemblyName: string;
  badTypeInfos: string;
  badCallDetails: string;
};

export type CallColumns = {
  // this could be refactored as one table with three or four columns, plus a join table
  fromAssemblyName: string;
  fromNamespace: string;
  fromTypeId: number;
  fromMethodId: number;
  toAssemblyName: string;
  toNamespace: string;
  toTypeId: number;
  toMethodId: number;
};

export type TypeNameColumns = {
  assemblyName: string;
  metadataToken: number;
  namespace: string | null;
  decoratedName: string;
  wantedTypeId: number | null;
};

export type MethodNameColumns = {
  assemblyName: string;
  metadataToken: number;
  name: string;
};

type ConfigColumns = {
  name: string;
  value: string;
};

type RecentColumns = {
  path: string;
  type: DataSourceType;
  when: number;
};

type GraphFilterColumns = {
  viewType: CommonGraphViewType;
  clusterBy: ClusterBy | "leafVisible";
  value: string;
};

type SavedTypeInfo = Omit<GoodTypeInfo, "members">;
const createSavedTypeInfo = (typeInfo: GoodTypeInfo): SavedTypeInfo => {
  const result: SavedTypeInfo = { ...typeInfo };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (result as any)["members"];
  return result;
};

type GoodTypeDictionary = {
  [key: number]: GoodTypeInfo;
};

const defaultReferenceViewOptions: ReferenceViewOptions = {
  nestedClusters: true,
  viewType: "references",
};

const defaultMethodViewOptions: MethodViewOptions = {
  methodId: methodNodeId("?", 0),
  viewType: "methods",
  showClustered: {
    clusterBy: "assembly",
    nestedClusters: true,
  },
  showEdgeLabels: {
    groups: false,
    leafs: false,
  },
};

const defaultApiViewOptions: ApiViewOptions = {
  viewType: "apis",
  showEdgeLabels: {
    groups: false,
    leafs: false,
  },
  showInternalCalls: false,
  showClustered: {
    clusterBy: "assembly",
    nestedClusters: true,
  },
};

const defaultCustomViewOptions: CustomViewOptions = {
  nodeProperties: [],
  clusterBy: [],
  tags: [],
  viewType: "custom",
  showEdgeLabels: {
    groups: false,
    leafs: false,
  },
};

export class SqlCustom {
  save: (nodes: CustomNode[], errors: CustomError[], when: string) => void;
  shouldReload: (when: string) => boolean;
  viewState: {
    onSave: (
      when: string,
      customSchemaVersion: string,
      nodeIds: NodeId[],
      nodeProperties: string[],
      tags: string[]
    ) => void;
    set customViewOptions(viewOptions: CustomViewOptions);
    get customViewOptions(): CustomViewOptions;
    get viewType(): ViewType;
    set viewType(value: ViewType);
    get cachedWhen(): string;
    get customSchemaVersion(): string;
  };
  readErrors: () => CustomError[];
  readAll: () => CustomNode[];
  close: () => void;
  private readLeafVisible: () => NodeId[];
  private readGroupExpanded: (clusterBy: string[]) => NodeId[];
  private writeLeafVisible: (leafVisible: NodeId[]) => void;
  private writeGroupExpanded: (clusterBy: string[], groupExpanded: NodeId[]) => void;
  readGraphFilter: (clusterBy: string[]) => GraphFilter;
  writeGraphFilter: (clusterBy: string[], graphFilter: GraphFilter) => void;

  constructor(db: Database) {
    const customSchemaVersionExpected = "2024-06-05";

    // even though the CustomNode elements each have a unique id
    // don't bother to store the data in normalized tables
    // because there isn't much of the data (it's hand-written)
    // also a schema mismatch doesn't drop and recreate the table
    const configTable = new SqlTable<ConfigColumns>(db, "configCustom", "name", () => false, {
      name: "foo",
      value: "bar",
    });

    configTable.deleteAll();

    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (nodes: CustomNode[], errors: CustomError[], when: string): void => {
      configTable.insert({ name: "nodes", value: JSON.stringify(nodes) });
      configTable.insert({ name: "errors", value: JSON.stringify(errors) });

      const nodeProperties = new Set<string>();
      nodes.forEach((node) =>
        Object.keys(node)
          .filter(isAnyOtherCustomField)
          .forEach((key) => nodeProperties.add(key))
      );

      const tags = new Set<string>();
      nodes.forEach((node) => node.tags?.forEach((tag) => tags.add(tag)));

      this.viewState.onSave(
        when,
        customSchemaVersionExpected,
        nodes.map((node) => nameNodeId("customLeaf", node.id)),
        [...nodeProperties],
        [...tags]
      );
      done();
    };

    this.shouldReload = (when: string): boolean =>
      !this.viewState.cachedWhen ||
      customSchemaVersionExpected !== this.viewState.customSchemaVersion ||
      Date.parse(this.viewState.cachedWhen) < Date.parse(when);

    this.readErrors = (): CustomError[] => {
      const o = configTable.selectOne({ name: "errors" });
      if (!o) throw new Error("Errors not initialized");
      return JSON.parse(o.value) as CustomError[];
    };

    this.readAll = (): CustomNode[] => {
      const o = configTable.selectOne({ name: "nodes" });
      if (!o) throw new Error("Nodes not initialized");
      return JSON.parse(o.value) as CustomNode[];
    };

    const keyGroupExpended = (clusterBy: string[]): string =>
      "clusterBy" + [clusterBy.length] ? "-" + clusterBy.join("-") : "";
    this.readLeafVisible = (): NodeId[] => {
      const found = configTable.selectOne({ name: "leafVisible" });
      if (!found) throw new Error("readLeafVisible nodes not found");
      return JSON.parse(found.value);
    };
    this.readGroupExpanded = (clusterBy: string[]): NodeId[] => {
      const found = configTable.selectOne({ name: keyGroupExpended(clusterBy) });
      if (!found) return []; // not predefined so initially all closed
      return JSON.parse(found.value);
    };
    this.writeLeafVisible = (leafVisible: NodeId[]): void => {
      configTable.upsert({ name: "leafVisible", value: JSON.stringify(leafVisible) });
    };
    this.writeGroupExpanded = (clusterBy: string[], groupExpanded: NodeId[]): void => {
      configTable.upsert({ name: keyGroupExpended(clusterBy), value: JSON.stringify(groupExpanded) });
    };
    this.readGraphFilter = (clusterBy: string[]): GraphFilter => ({
      leafVisible: this.readLeafVisible(),
      groupExpanded: this.readGroupExpanded(clusterBy),
    });
    this.writeGraphFilter = (clusterBy: string[], graphFilter: GraphFilter): void => {
      this.writeLeafVisible(graphFilter.leafVisible);
      this.writeGroupExpanded(clusterBy, graphFilter.groupExpanded);
    };

    this.viewState = {
      onSave: (
        when: string,
        customSchemaVersion: string,
        nodeIds: NodeId[],
        nodeProperties: string[],
        tags: string[]
      ): void => {
        configTable.upsert({ name: "when", value: when });
        configTable.upsert({ name: "customSchemaVersion", value: customSchemaVersion });

        this.viewState.customViewOptions = {
          ...defaultCustomViewOptions,
          nodeProperties: nodeProperties.sort(),
          tags: tags.sort().map((tag) => ({ tag, shown: true })),
        };

        this.writeLeafVisible(nodeIds);
      },
      set customViewOptions(viewOptions: CustomViewOptions) {
        configTable.upsert({ name: "viewOptions", value: JSON.stringify(viewOptions) });
      },
      get customViewOptions(): CustomViewOptions {
        const o = configTable.selectOne({ name: "viewOptions" });
        if (!o) throw new Error("viewOptions not initialized");
        return JSON.parse(o.value) as CustomViewOptions;
      },
      get viewType(): ViewType {
        const o = configTable.selectOne({ name: "viewType" });
        if (!o) return "custom";
        return o.value as ViewType;
      },
      set viewType(value: ViewType) {
        configTable.upsert({ name: "viewType", value });
      },
      get cachedWhen(): string {
        const o = configTable.selectOne({ name: "when" });
        if (!o) return "";
        return o.value;
      },
      get customSchemaVersion(): string {
        const o = configTable.selectOne({ name: "customSchemaVersion" });
        if (!o) return "";
        return o.value;
      },
    };

    this.close = () => {
      done();
      db.close();
    };
  }
}

export class SqlLoaded {
  save: (reflected: Reflected, when: string, hashDataSource: string) => void;
  shouldReload: (when: string) => boolean;
  viewState: ViewState;
  readAssemblyReferences: () => AssemblyReferences;
  readTypes: (assemblyName: string) => AllTypeInfo;
  readMethod: (assemblyName: string, methodId: number) => TypeAndMethodDetails;
  readErrors: () => ErrorsInfo[];
  readCalls: (clusterBy: ClusterBy, expandedClusterNames: string[]) => CallColumns[];
  readTypeNames: () => TypeNameColumns[];
  readMethodNames: () => MethodNameColumns[];

  private readLeafVisible: (viewType: CommonGraphViewType) => NodeId[];
  private readGroupExpanded: (viewType: CommonGraphViewType, clusterBy: ClusterBy) => NodeId[];
  private writeLeafVisible: (viewType: CommonGraphViewType, leafVisible: NodeId[]) => void;
  private writeGroupExpanded: (viewType: CommonGraphViewType, clusterBy: ClusterBy, groupExpanded: NodeId[]) => void;
  readGraphFilter: (viewType: CommonGraphViewType, clusterBy: ClusterBy) => GraphFilter;
  writeGraphFilter: (viewType: CommonGraphViewType, clusterBy: ClusterBy, graphFilter: GraphFilter) => void;

  close: () => void;

  constructor(db: Database) {
    const loadedSchemaVersionExpected = "2024-06-07";

    this.viewState = new ViewState(db);

    const schema = this.viewState.loadedSchemaVersion;
    if (schema !== loadedSchemaVersionExpected) {
      // schema has changed
      dropTable(db, "assembly");
      dropTable(db, "type");
      dropTable(db, "member");
      dropTable(db, "method");
      dropTable(db, "error");
      dropTable(db, "call");
      dropTable(db, "typeName");
      dropTable(db, "methodName");
      dropTable(db, "graphFilter");
      this.viewState.loadedSchemaVersion = loadedSchemaVersionExpected;
      this.viewState.cachedWhen = ""; // force a reload of the data
    }

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
    const graphFilterTable = new SqlTable<GraphFilterColumns>(
      db,
      "graphFilter",
      ["viewType", "clusterBy"],
      () => false,
      {
        viewType: "references",
        clusterBy: "assembly",
        value: "baz",
      }
    );

    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (reflected: Reflected, when: string, hashDataSource: string) => {
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

      log("save reflected.assemblies");

      // create a dictionary to find typeId from methodId
      const assemblyMethodTypes: { [assemblyName: string]: { [methodId: number]: number } } = {};
      const assemblyMethodNames: MethodNameColumns[] = [];

      const assemblyTypeIds: TypeNodeId[] = [];
      const assemblyTypeNames: { [assemblyName: string]: { [typeId: number]: TypeNameColumns } } = {};

      for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
        // typeIds dictionary
        const methodTypes: { [methodId: number]: number } = {};
        assemblyMethodTypes[assemblyName] = methodTypes;

        // => assemblyTable
        assemblyTable.insert({
          assemblyName,
          // uniqueStrings because I've unusually seen an assembly return two references to the same assembly name
          references: JSON.stringify(uniqueStrings(assemblyInfo.referencedAssemblies)),
        });

        const allTypeInfo = validateTypeInfo(assemblyInfo.types);

        for (const type of allTypeInfo.good) {
          const typeInfo = createSavedTypeInfo(type);

          // => typeTable
          typeTable.insert({
            assemblyName,
            metadataToken: typeInfo.typeId.metadataToken,
            typeInfo: JSON.stringify(typeInfo),
          });

          assemblyTypeIds.push(typeNodeId(assemblyName, typeInfo.typeId.metadataToken));

          for (const [memberType, memberInfos] of Object.entries(type.members)) {
            const members: MemberColumns[] = memberInfos.map((memberInfo) => {
              if ((memberType as keyof Members) == "methodMembers") {
                methodTypes[memberInfo.metadataToken] = typeInfo.typeId.metadataToken;
                assemblyMethodNames.push({
                  assemblyName,
                  name: memberInfo.name,
                  metadataToken: memberInfo.metadataToken,
                });
              }
              return {
                assemblyName,
                // memberType is string[] -- https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208
                memberType: memberType as keyof Members,
                typeMetadataToken: typeInfo.typeId.metadataToken,
                metadataToken: memberInfo.metadataToken,
                memberInfo: JSON.stringify(memberInfo),
              };
            });
            // => memberTable
            memberTable.insertMany(members);
          }
        }

        const { unwantedTypes } = nestTypes(allTypeInfo.good);
        const typeNameColumns: TypeNameColumns[] = allTypeInfo.good.map((typeInfo) => ({
          assemblyName,
          metadataToken: typeInfo.typeId.metadataToken,
          namespace: typeInfo.typeId.namespace ?? null,
          decoratedName: getTypeInfoName(typeInfo),
          // the wantedTypeId is used to avoid calls to compiler-generated nested types e.g. for anonymous predicates
          wantedTypeId: unwantedTypes[typeInfo.typeId.metadataToken] ?? null,
        }));
        // => typeNameTable
        typeNameTable.insertMany(typeNameColumns);

        const typeNames: { [typeId: number]: TypeNameColumns } = {};
        typeNameColumns.forEach((nameColumns) => (typeNames[nameColumns.metadataToken] = nameColumns));
        assemblyTypeNames[assemblyName] = typeNames;

        // => errorsTable
        const bad = badTypeInfo(allTypeInfo);
        if (bad.length) {
          errorTable.insert({ assemblyName, badTypeInfos: JSON.stringify(bad), badCallDetails: JSON.stringify([]) });
        }
      }

      log("save reflected.assemblyMethods");

      const assemblyCalls: {
        [assemblyName: string]: { [methodId: number]: { assemblyName: string; methodId: number }[] };
      } = {};

      const distinctCalls = distinctor<{ assemblyName: string; methodId: number }>(
        (lhs, rhs) => lhs.assemblyName == rhs.assemblyName && lhs.methodId == rhs.methodId
      );

      for (const [assemblyName, methodsDictionary] of Object.entries(reflected.assemblyMethods)) {
        const badCallDetails: BadCallDetails[] = [];

        const methodCalls: { [methodId: number]: { assemblyName: string; methodId: number }[] } = {};
        assemblyCalls[assemblyName] = methodCalls;

        const methods: MethodColumns[] = Object.entries(methodsDictionary).map(([key, methodDetails]) => {
          const metadataToken = +key;

          // remember any which are bad
          badCallDetails.push(...methodDetails.calls.filter(isBadCallDetails));

          // remember all to be copied into CallsColumns
          methodCalls[metadataToken] = methodDetails.calls
            .filter(isGoodCallDetails)
            .map((callDetails) => ({
              assemblyName: callDetails.assemblyName,
              methodId: callDetails.metadataToken,
            }))
            .filter(distinctCalls);

          // return MethodColumns
          return { assemblyName, metadataToken, methodDetails: JSON.stringify(methodDetails) };
        });

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

      const getWanted = (assemblyName: string, methodId: number): { namespace: string; wantedTypeId: number } => {
        // get typeId from methodId
        const typeId = assemblyMethodTypes[assemblyName][methodId];
        // get namespace and wantedTypeId from typeId
        const found = assemblyTypeNames[assemblyName][typeId];
        return {
          namespace: found.namespace ?? "(no namespace)",
          wantedTypeId: found.wantedTypeId ?? found.metadataToken,
        };
      };

      const callColumns: CallColumns[] = [];
      Object.entries(assemblyCalls).forEach(([assemblyName, methodCalls]) =>
        Object.keys(methodCalls).forEach((key) => {
          const methodId = +key;
          const { namespace: fromNamespace, wantedTypeId: fromTypeId } = getWanted(assemblyName, methodId);
          methodCalls[methodId].forEach((called) => {
            const { namespace: toNamespace, wantedTypeId: toTypeId } = getWanted(called.assemblyName, called.methodId);
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

      // => methodNameTable
      methodNameTable.insertMany(assemblyMethodNames);

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

    this.readMethod = (assemblyName: string, methodId: number): TypeAndMethodDetails => {
      const methodKey = { assemblyName, metadataToken: methodId };
      const member = memberTable.selectOne(methodKey);
      if (!member) throw new Error(`Member not found ${JSON.stringify(methodKey)}`);
      const typeKey = { assemblyName, metadataToken: member.typeMetadataToken };
      const type = typeTable.selectOne(typeKey);
      if (!type) throw new Error(`Type not found ${JSON.stringify(typeKey)}`);
      const method = methodTable.selectOne(methodKey);
      if (!method) throw new Error(`Method details not found ${JSON.stringify(methodKey)}`);
      return {
        type: { ...(JSON.parse(type.typeInfo) as SavedTypeInfo), members: {} },
        method: { ...(JSON.parse(member.memberInfo) as MethodMember) },
        methodDetails: { ...(JSON.parse(method.methodDetails) as MethodDetails) },
      };
    };

    this.readErrors = (): ErrorsInfo[] =>
      errorTable.selectAll().map((errorColumns) => ({
        assemblyName: errorColumns.assemblyName,
        badTypeInfos: JSON.parse(errorColumns.badTypeInfos),
        badCallDetails: JSON.parse(errorColumns.badCallDetails),
      }));

    const getFromAndToNames = (clusterBy: ClusterBy): { fromName: keyof CallColumns; toName: keyof CallColumns } => {
      switch (clusterBy) {
        case "assembly":
          return { fromName: "fromAssemblyName", toName: "toAssemblyName" };
        case "namespace":
          return { fromName: "fromNamespace", toName: "toNamespace" };
      }
    };

    this.readCalls = (clusterBy: ClusterBy, expandedClusterNames: string[]): CallColumns[] => {
      const { fromName, toName } = getFromAndToNames(clusterBy);
      const result = callTable.selectCustom(true, `${fromName} != ${toName}`);
      expandedClusterNames.forEach((clusterName) =>
        result.push(
          ...callTable.selectCustom(true, `${fromName} == ${toName} AND ${fromName} == @clusterName`, {
            clusterName,
          })
        )
      );
      return result;
    };

    this.readTypeNames = (): TypeNameColumns[] => typeNameTable.selectAll();
    this.readMethodNames = (): MethodNameColumns[] => methodNameTable.selectAll();

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

class SqlConfigTable {
  getConfig: () => ConfigColumns[];
  setConfig: (config: ConfigColumns) => void;

  constructor(db: Database) {
    const configTable = new SqlTable<ConfigColumns>(db, "config", "name", () => false, {
      name: "dataSource",
      value: "bar",
    });

    this.getConfig = () => configTable.selectAll();
    this.setConfig = (config: ConfigColumns) => configTable.upsert(config);
  }
}

type IValues = {
  [key: string]: string | undefined;
};

class ConfigCache {
  private _sqlConfig: SqlConfigTable;
  private _values: IValues = {};

  constructor(db: Database) {
    this._sqlConfig = new SqlConfigTable(db);
    const pairs = this._sqlConfig.getConfig();
    for (const pair of pairs) this._values[pair.name] = pair.value;
  }

  setValue(name: string, value: string | undefined) {
    value = value ?? "";
    this._sqlConfig.setConfig({ name, value });
    this._values[name] = value;
  }
  getValue(name: string): string | undefined {
    return this._values[name];
  }
}

export class ViewState {
  private _cache: ConfigCache;

  constructor(db: Database) {
    this._cache = new ConfigCache(db);
  }

  onSave(when: string, hashDataSource: string, version: string, exes: string[]) {
    this.cachedWhen = when;
    this.hashDataSource = hashDataSource;
    this.loadedVersion = version;
    this.exes = exes;
    this.referenceViewOptions = defaultReferenceViewOptions;
    this.methodViewOptions = defaultMethodViewOptions;
    this.apiViewOptions = defaultApiViewOptions;
  }

  // this changes when the SQL schema definition changes
  get loadedSchemaVersion(): string | undefined {
    return this._cache.getValue("loadedSchemaVersion");
  }
  set loadedSchemaVersion(value: string | undefined) {
    this._cache.setValue("loadedSchemaVersion", value);
  }
  // this changes when the format of Reflected data changes
  get loadedVersion(): string {
    return this._cache.getValue("loadedVersion") ?? "";
  }
  set loadedVersion(value: string) {
    this._cache.setValue("loadedVersion", value);
  }
  // this changes when the data source (e.g. the assemblies being inspected) changes
  get cachedWhen(): string {
    return this._cache.getValue("cachedWhen") ?? "";
  }
  set cachedWhen(value: string) {
    this._cache.setValue("cachedWhen", value);
  }
  // this identifies the DataSource
  get hashDataSource(): string {
    return this._cache.getValue("hashDataSource") ?? "";
  }
  set hashDataSource(value: string) {
    this._cache.setValue("hashDataSource", value);
  }

  set referenceViewOptions(viewOptions: ReferenceViewOptions) {
    this._cache.setValue("referenceViewOptions", JSON.stringify(viewOptions));
  }
  get referenceViewOptions(): ReferenceViewOptions {
    const value = this._cache.getValue("referenceViewOptions");
    return value ? { defaultReferenceViewOptions, ...JSON.parse(value) } : defaultReferenceViewOptions;
  }

  set methodViewOptions(viewOptions: MethodViewOptions) {
    this._cache.setValue("methodViewOptions", JSON.stringify(viewOptions));
  }
  get methodViewOptions(): MethodViewOptions {
    const value = this._cache.getValue("methodViewOptions");
    return value ? { ...defaultMethodViewOptions, ...JSON.parse(value) } : defaultMethodViewOptions;
  }

  set apiViewOptions(viewOptions: ApiViewOptions) {
    this._cache.setValue("apiViewOptions", JSON.stringify(viewOptions));
  }
  get apiViewOptions(): ApiViewOptions {
    const value = this._cache.getValue("apiViewOptions");
    return value ? { defaultApiViewOptions, ...JSON.parse(value) } : defaultApiViewOptions;
  }

  set exes(names: string[]) {
    this._cache.setValue("exes", JSON.stringify(names));
  }
  get exes(): string[] {
    const value = this._cache.getValue("exes");
    return value ? JSON.parse(value) : [];
  }

  get viewType(): ViewType {
    return (this._cache.getValue("viewType") as ViewType) ?? "references";
  }
  set viewType(value: ViewType) {
    this._cache.setValue("viewType", value);
  }
}

export type DataSourceType = "loadedAssemblies" | "customJson" | "coreJson";

export type DataSource = {
  path: string;
  type: DataSourceType;
  hash: string;
};

export class SqlConfig {
  private _cache: ConfigCache;
  private _db: Database;
  recent: () => RecentColumns[];
  private upsertRecent: (recentColumns: RecentColumns) => void;

  constructor(db: Database) {
    this._cache = new ConfigCache(db);
    this._db = db;

    const recentTable = new SqlTable<RecentColumns>(db, "recent", "path", () => false, {
      path: "foo",
      type: "loadedAssemblies",
      when: 0,
    });

    this.recent = () => recentTable.selectAll();
    this.upsertRecent = (recentColumns: RecentColumns) => recentTable.upsert(recentColumns);
  }

  get dataSource(): DataSource | undefined {
    const value = this._cache.getValue("dataSource");
    return value ? JSON.parse(value) : undefined;
  }

  set dataSource(value: DataSource | undefined) {
    this._cache.setValue("dataSource", JSON.stringify(value));
    if (value) this.upsertRecent({ path: value.path, type: value.type, when: Date.now() });
  }

  set appOptions(appOptions: AppOptions) {
    this._cache.setValue("appOptions", JSON.stringify(appOptions));
  }
  get appOptions(): AppOptions {
    const value = this._cache.getValue("appOptions");
    return value ? { defaultAppOptions, ...JSON.parse(value) } : defaultAppOptions;
  }

  close() {
    const result = this._db.pragma("wal_checkpoint(TRUNCATE)");
    log(`wal_checkpoint: ${JSON.stringify(result)}`);
    this._db.close();
  }
}

export function createSqlLoaded(filename: string): SqlLoaded {
  log("createSqlLoaded");
  return new SqlLoaded(createSqlDatabase(filename));
}

export function createSqlCustom(filename: string): SqlCustom {
  log("createSqlCustom");
  return new SqlCustom(createSqlDatabase(filename));
}

export function createSqlConfig(filename: string): SqlConfig {
  log("createSqlConfig");
  return new SqlConfig(createSqlDatabase(filename));
}
