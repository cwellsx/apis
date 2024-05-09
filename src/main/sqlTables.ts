import { Database } from "better-sqlite3";
import type { AppOptions, Members, MethodViewOptions, ReferenceViewOptions, ViewType } from "../shared-types";
import { defaultAppOptions } from "../shared-types";
import type {
  AllTypeInfo,
  AssemblyReferences,
  BadTypeInfo,
  GoodTypeInfo,
  MethodDetails,
  MethodMember,
  Reflected,
} from "./loaded";
import { badTypeInfo, validateTypeInfo } from "./loaded";
import { log } from "./log";
import { TypeAndMethod } from "./shared-types";
import { createSqlDatabase } from "./sqlDatabase";
import { SqlTable, dropTable } from "./sqlTable";

export type BadCallInfo = { metadataToken: number };
export type ErrorsInfo = { assemblyName: string; badTypeInfos: BadTypeInfo[]; badCallInfos: BadCallInfo[] };

/*
  This defines all SQLite tables used by the application, include the record format and the methods to access them
  They're all in this one source file, because their implementations are similar

  - SqlLoaded is implemented using
    - SqlTable<AssemblyColumns>
    - SqlTable<TypeColumns>
    - SqlTable<MemberColumns>
    - SqlTable<MethodColumns>
    - SqlTable<BadTypeColumns>
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
*/

type AssemblyColumns = {
  assemblyName: string;
  // JSON-encoded array of names of referenced assemblies
  references: string;
};

type TypeColumns = {
  assemblyName: string;
  metadataToken: number; // Id of Type within assembly
  namespace?: string; // not currently used
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

type ErrorsColumns = {
  assemblyName: string;
  badTypeInfos: string;
  badCallInfos: string;
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

const loadedSchemaVersion = "2024-05-08";

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
  showGrouped: true,
  leafVisible: [],
  groupExpanded: [],
  viewType: "references",
};

const defaultMethodViewOptions: MethodViewOptions = {
  showGrouped: true,
  leafVisible: [],
  groupExpanded: [],
  topType: "assembly",
  methodId: { assemblyName: "", metadataToken: 0 },
  viewType: "methods",
};

export class SqlLoaded {
  save: (reflected: Reflected, when: string, hashDataSource: string) => void;
  viewState: ViewState;
  readAssemblyReferences: () => AssemblyReferences;
  readTypes: (assemblyName: string) => AllTypeInfo;
  readMethod: (assemblyName: string, methodId: number) => TypeAndMethod;
  readErrors: () => ErrorsInfo[];
  close: () => void;

  constructor(db: Database) {
    this.viewState = new ViewState(db);

    const schema = this.viewState.loadedSchemaVersion;
    if (schema !== loadedSchemaVersion) {
      // schema has changed
      dropTable(db, "assembly");
      dropTable(db, "type");
      dropTable(db, "member");
      dropTable(db, "method");
      dropTable(db, "errors");
      this.viewState.loadedSchemaVersion = loadedSchemaVersion;
      this.viewState.cachedWhen = ""; // force a reload of the data
    }

    const assemblyTable = new SqlTable<AssemblyColumns>(db, "assembly", "assemblyName", () => false, {
      assemblyName: "foo",
      references: "bar",
    });
    const typeTable = new SqlTable<TypeColumns>(
      db,
      "type",
      ["assemblyName", "metadataToken"],
      (key) => key == "namespace",
      {
        assemblyName: "foo",
        metadataToken: 1,
        namespace: "baz",
        typeInfo: "bar",
      }
    );
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
    const errorsTable = new SqlTable<ErrorsColumns>(db, "errors", "assemblyName", () => false, {
      assemblyName: "foo",
      badTypeInfos: "bar",
      badCallInfos: "baz",
    });

    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (reflected: Reflected, when: string, hashDataSource: string) => {
      methodTable.deleteAll();
      memberTable.deleteAll();
      typeTable.deleteAll();
      errorsTable.deleteAll();
      assemblyTable.deleteAll();

      log("save reflected.assemblies");

      for (const [assemblyName, assemblyInfo] of Object.entries(reflected.assemblies)) {
        // => assemblyTable
        assemblyTable.insert({ assemblyName, references: JSON.stringify(assemblyInfo.referencedAssemblies) });

        const allTypeInfo = validateTypeInfo(assemblyInfo.types);

        for (const type of allTypeInfo.good) {
          const members = type.members;
          const typeInfo = createSavedTypeInfo(type);

          // => typeTable
          typeTable.insert({
            assemblyName,
            metadataToken: typeInfo.typeId.metadataToken,
            namespace: typeInfo.typeId.namespace,
            typeInfo: JSON.stringify(typeInfo),
          });

          for (const [memberType, memberInfos] of Object.entries(members)) {
            const many: MemberColumns[] = memberInfos.map((memberInfo) => {
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
            memberTable.insertMany(many);
          }
        }

        // => errorsTable
        const bad = badTypeInfo(allTypeInfo);
        if (bad.length) {
          errorsTable.insert({ assemblyName, badTypeInfos: JSON.stringify(bad), badCallInfos: JSON.stringify([]) });
        }
      }

      log("save reflected.assemblyMethods");

      for (const [assemblyName, methodsDictionary] of Object.entries(reflected.assemblyMethods)) {
        const badCallInfos: BadCallInfo[] = [];

        const methods: MethodColumns[] = Object.entries(methodsDictionary).map(([key, methodDetails]) => {
          if (methodDetails.calls.some((callDetails) => callDetails.error)) badCallInfos.push({ metadataToken: +key });
          return { assemblyName, metadataToken: +key, methodDetails: JSON.stringify(methodDetails) };
        });

        // => errorsTable
        if (badCallInfos.length) {
          const found = errorsTable.selectOne({ assemblyName });
          const columns = {
            assemblyName,
            badTypeInfos: found?.badTypeInfos ?? JSON.stringify([]),
            badCallInfos: JSON.stringify(badCallInfos),
          };
          if (found) errorsTable.update(columns);
          else errorsTable.insert(columns);
        }

        // => methodTable
        methodTable.insertMany(methods);
      }

      // => viewState => _cache => _sqlConfig
      this.viewState.onSave(when, hashDataSource, reflected.version, reflected.exes, Object.keys(reflected.assemblies));

      log("save complete");
      done();
      log("save done");
    };

    this.readAssemblyReferences = () =>
      assemblyTable.selectAll().reduce<AssemblyReferences>((found, entry) => {
        found[entry.assemblyName] = JSON.parse(entry.references);
        return found;
      }, {});

    this.readTypes = (assemblyName: string): AllTypeInfo => {
      const where = { assemblyName };

      // all the bad types are JSON in a single record
      const errors = errorsTable.selectWhere(where);
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

    this.readMethod = (assemblyName: string, methodId: number): TypeAndMethod => {
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
      errorsTable.selectAll().map((errorColumns) => ({
        assemblyName: errorColumns.assemblyName,
        badTypeInfos: JSON.parse(errorColumns.badTypeInfos),
        badCallInfos: JSON.parse(errorColumns.badCallInfos),
      }));

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

  onSave(when: string, hashDataSource: string, version: string, exes: string[], assemblyNames: string[]) {
    this.cachedWhen = when;
    this.hashDataSource = hashDataSource;
    this.loadedVersion = version;
    this.exes = exes;
    this.referenceViewOptions = { ...defaultReferenceViewOptions, leafVisible: assemblyNames };
    this.methodViewOptions = defaultMethodViewOptions;
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
    return value ? { defaultMethodViewOptions, ...JSON.parse(value) } : defaultMethodViewOptions;
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

type DataSourceType = "loadedAssemblies" | "customJson" | "coreJson";

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

export function createSqlConfig(filename: string): SqlConfig {
  log("createSqlConfig");
  return new SqlConfig(createSqlDatabase(filename));
}
