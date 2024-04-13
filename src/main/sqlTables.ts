import { Database } from "better-sqlite3";
import type { AppOptions, ViewOptions } from "../shared-types";
import { defaultAppOptions, defaultViewOptions } from "../shared-types";
import { IAssemblyMethods, IAssemblyReferences, IAssemblyTypes, Loaded } from "./loaded";
import { log } from "./log";
import { createSqlDatabase } from "./sqlDatabase";
import { SqlTable } from "./sqlTable";

/*
  This defines all SQLite tables used by the application, include the record format and the methods to access them
  They're all in this one source file, because their implementations are similar
  The schema isn't 'relational', instead the tables are key-value pairs whose values are JSON objects akak 'documents'

  - SqlLoaded is implemented using
    - SqlTable<AssemblyColumns>
    - SqlTable<TypeColumns>
    - ViewState i.e. ConfigCache
  
  - SqlConfig is implemented using
    - SqlTable<RecentColumns>
    - ConfigCache i.e. SqlConfigTable plus a values cache
  
  - SqlConfigTable is implemented using
    - SqlTable<ConfigColumns>
  
  SqlLoaded saves and reads a instances of the Loaded type, which contains all TypeInfo and all MethodDetails.
  All this data is:
  - Obtained from Core.exe via the electron-cgi connection
  - Saved into the SQLite table
  - Reloaded into the application as a single object

  Perhaps in future this will prove to be too much data in a single object, in which case:
  - Read incrementally from Core.exe
  - Save incrementally into the SQLite tables
  - Keep most of the data only in SQLite and not instantiated in memory
  - Read selectively i.e. without using selectAll
*/

type AssemblyColumns = {
  name: string;
  references: string;
};

type TypeColumns = {
  // each record contains all TypeInfo for a single assembly, application reads one assembly at a time
  name: string;
  typeInfo: string;
};

type MethodColumns = {
  // each record contains MethodDetails for a single method, application reads several methods at a time
  name: string;
  metadataToken: number;
  methodDetails: string;
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

export class SqlLoaded {
  save: (loaded: Loaded, when: string) => void;
  read: () => Loaded;
  viewState: ViewState;

  close: () => void;

  constructor(db: Database) {
    const assemblyTable = new SqlTable<AssemblyColumns>(db, "assembly", "name", () => false, {
      name: "foo",
      references: "bar",
    });
    const typeTable = new SqlTable<TypeColumns>(db, "type", "name", () => false, {
      name: "foo",
      typeInfo: "bar",
    });
    const methodTable = new SqlTable<MethodColumns>(db, "method", ["name", "metadataToken"], () => false, {
      name: "foo",
      metadataToken: 1,
      methodDetails: "bar",
    });

    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (loaded: Loaded, when: string) => {
      assemblyTable.deleteAll();
      for (const key in loaded.assemblies)
        assemblyTable.insert({ name: key, references: JSON.stringify(loaded.assemblies[key]) });
      typeTable.deleteAll();
      for (const key in loaded.types) typeTable.insert({ name: key, typeInfo: JSON.stringify(loaded.types[key]) });
      for (const key in loaded.methods) {
        const methodsDictionary = loaded.methods[key];
        for (const metadataToken in methodsDictionary)
          methodTable.insert({
            name: key,
            metadataToken: +metadataToken,
            methodDetails: JSON.stringify(methodsDictionary[metadataToken]),
          });
      }
      this.viewState.onSave(when, loaded.version, loaded.exes, Object.keys(loaded.assemblies));
      done();
    };

    this.read = () => {
      const assemblies: IAssemblyReferences = {};
      const types: IAssemblyTypes = {};
      const methods: IAssemblyMethods = {};
      assemblyTable.selectAll().forEach((assembly) => (assemblies[assembly.name] = JSON.parse(assembly.references)));
      typeTable.selectAll().forEach((type) => (types[type.name] = JSON.parse(type.typeInfo)));
      methodTable.selectAll().forEach((method) => {
        const { name, metadataToken, methodDetails } = method;
        let methodsDictionary = methods[name];
        if (!methodsDictionary) methods[name] = methodsDictionary = {};
        methodsDictionary[metadataToken] = JSON.parse(methodDetails);
      });
      return { assemblies, types, methods, version: this.viewState.loadedVersion, exes: this.viewState.exes };
    };

    this.close = () => {
      done();
      db.close();
    };

    this.viewState = new ViewState(db);
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

  onSave(when: string, version: string, exes: string[], leafVisible: string[]) {
    this.cachedWhen = when;
    this.loadedVersion = version;
    this.exes = exes;
    this.leafVisible = leafVisible;
  }

  get cachedWhen(): string | undefined {
    return this._cache.getValue("cachedWhen");
  }
  set cachedWhen(value: string | undefined) {
    this._cache.setValue("cachedWhen", value);
  }

  set leafVisible(value: string[]) {
    this._cache.setValue("leafVisible", JSON.stringify(value));
  }
  get leafVisible(): string[] {
    const value = this._cache.getValue("leafVisible");
    return value ? JSON.parse(value) : [];
  }

  set groupExpanded(names: string[]) {
    this._cache.setValue("groupExpanded", JSON.stringify(names));
  }
  get groupExpanded(): string[] {
    const value = this._cache.getValue("groupExpanded");
    return value ? JSON.parse(value) : [];
  }

  set viewOptions(viewOptions: ViewOptions) {
    this._cache.setValue("viewOptions", JSON.stringify(viewOptions));
  }
  get viewOptions(): ViewOptions {
    const value = this._cache.getValue("viewOptions");
    return value ? { defaultViewOptions, ...JSON.parse(value) } : defaultViewOptions;
  }

  get loadedVersion(): string {
    return this._cache.getValue("loadedVersion") ?? "";
  }
  set loadedVersion(value: string) {
    this._cache.setValue("loadedVersion", value);
  }

  set exes(names: string[]) {
    this._cache.setValue("exes", JSON.stringify(names));
  }
  get exes(): string[] {
    const value = this._cache.getValue("exes");
    return value ? JSON.parse(value) : [];
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
