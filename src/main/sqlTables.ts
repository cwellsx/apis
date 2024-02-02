import { Database } from "better-sqlite3";
import { IAssemblies, ITypes, Loaded } from "../shared-types";
//import { ConfigKey } from "./configTypes";
import { log } from "./log";
import { createSqlDatabase } from "./sqlDatabase";
import { SqlTable } from "./sqlTable";

// this defines all SQLite tables used by the application, include the record format and the methods to access them
// they're all in this one source file, because their implementations are similar
// the schema isn't 'relational', instead the tables are key-value pairs whose values are JSON objects akak 'documents'

type AssemblyColumns = {
  name: string;
  references: string;
};

type TypeColumns = {
  name: string;
  typeInfo: string;
};

export type ConfigColumns = {
  name: string;
  value: string;
};

export class SqlLoaded {
  save: (loaded: Loaded) => void;
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

    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (loaded: Loaded) => {
      assemblyTable.deleteAll();
      for (const key in loaded.assemblies)
        assemblyTable.insert({ name: key, references: JSON.stringify(loaded.assemblies[key]) });
      typeTable.deleteAll();
      for (const key in loaded.types) typeTable.insert({ name: key, typeInfo: JSON.stringify(loaded.types[key]) });
      done();
    };

    this.read = () => {
      const assemblies: IAssemblies = {};
      const types: ITypes = {};
      assemblyTable.selectAll().forEach((assembly) => (assemblies[assembly.name] = JSON.parse(assembly.references)));
      typeTable.selectAll().forEach((type) => (types[type.name] = JSON.parse(type.typeInfo)));
      return { assemblies, types };
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
  private _isShown: Set<string> | undefined; // if it's not in the database, or an empty string, then they're all shown

  constructor(db: Database) {
    this._cache = new ConfigCache(db);
  }

  get cachedWhen(): string | undefined {
    return this._cache.getValue("cachedWhen");
  }
  set cachedWhen(value: string | undefined) {
    this._cache.setValue("cachedWhen", value);
  }

  setShown(names: string[]): void {
    const json = JSON.stringify(names);
    this._cache.setValue("isShown", json);
    this._isShown = new Set<string>(names);
  }
  isShown(name: string): boolean {
    return !this._isShown ? true : this._isShown.has(name);
  }
}

export type DataSource = {
  path: string;
  type: "loadedAssemblies" | "customJson";
  hash: string;
};

export class SqlConfig {
  private _cache: ConfigCache;
  private _db: Database;

  constructor(db: Database) {
    this._cache = new ConfigCache(db);
    this._db = db;
  }

  get dataSource(): DataSource | undefined {
    const value = this._cache.getValue("dataSource");
    return value ? JSON.parse(value) : undefined;
  }

  set dataSource(value: DataSource | undefined) {
    this._cache.setValue("dataSource", JSON.stringify(value));
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
