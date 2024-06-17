import { Database } from "better-sqlite3";
import type {
  ClusterBy,
  CommonGraphViewType,
  ErrorsInfo,
  GraphFilter,
  Members,
  MethodNodeId,
  NodeId,
  TypeNodeId,
} from "../../shared-types";
import { nameNodeId, typeNodeId } from "../../shared-types";
import type {
  AllTypeInfo,
  AssemblyReferences,
  BadCallDetails,
  BadTypeInfo,
  GoodTypeInfo,
  MethodDetails,
  Reflected,
} from "../loaded";
import { badTypeInfo, isBadCallDetails, isGoodCallDetails, loadedVersion, validateTypeInfo } from "../loaded";
import { log } from "../log";
import type { Call, Direction, GetTypeOrMethodName, TypeAndMethodId } from "../shared-types";
import { distinctor, getTypeAndMethodNames, getTypeInfoName, nestTypes } from "../shared-types";
import { uniqueStrings } from "../shared-types/remove";
import { SqlTable, dropTable } from "./sqlTable";
import { ViewState } from "./viewState";

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

type CallColumns = {
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

type TypeNameColumns = {
  assemblyName: string;
  metadataToken: number;
  namespace: string | null;
  decoratedName: string;
  wantedTypeId: number | null;
};

type MethodNameColumns = {
  assemblyName: string;
  metadataToken: number;
  name: string;
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

      const getTypeFromMethod = (assemblyName: string, methodId: number): TypeNameColumns => {
        // get typeId from methodId
        const typeId = assemblyMethodTypes[assemblyName][methodId];
        // get namespace and wantedTypeId from typeId
        return assemblyTypeNames[assemblyName][typeId];
      };

      type GetOwnerMethod = (assemblyName: string, nestedType: number) => number | undefined;
      const nestMethods = () => {
        // a "nested type" is a compiler-generated type which implements anonymous delegates
        // they have methods and are defined outside the method which calls the delegate
        // guess that each is called from only one method
        const ownedTypes: { [assemblyName: string]: { [nestedType: number]: number } } = {};

        Object.entries(assemblyCalls).forEach(([assemblyName, methodCalls]) =>
          Object.entries(methodCalls).forEach(([caller, allCalled]) => {
            const callerId = +caller;
            // which types is this method calling?
            allCalled.forEach((calledMethod) => {
              const calledType = getTypeFromMethod(calledMethod.assemblyName, calledMethod.methodId);
              if (!calledType.wantedTypeId) return;
              // sanity check
              if (
                calledMethod.assemblyName !== assemblyName ||
                assemblyMethodTypes[assemblyName][callerId] !== calledType.wantedTypeId
              )
                throw new Error("Expect nested type to be called by method within its wanted type");
              // get or set this type's owner method
              const ownerMethod = ownedTypes[assemblyName][calledType.metadataToken];
              if (!ownerMethod) ownedTypes[assemblyName][calledType.metadataToken] == callerId;
              else if (ownerMethod !== callerId) {
                throw new Error("Nested type has more than one owner method");
              }
            });
          })
        );

        const getOwnerMethod: GetOwnerMethod = (assemblyName: string, nestedType: number) =>
          ownedTypes[assemblyName][nestedType];

        return getOwnerMethod;
      };

      const getOwnerMethod = nestMethods();

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
