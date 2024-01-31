import { Database } from "better-sqlite3";
import { IAssemblies, ITypes, Loaded } from "../shared-types";
import { ConfigKey } from "./configTypes";
import { log } from "./log";
import { createSqlDatabase } from "./sqlDatabase";
import { SqlTable } from "./sqlTable";

type Assembly = {
  name: string;
  references: string;
};

type Type = {
  name: string;
  typeInfo: string;
};

export type ConfigPair = {
  name: ConfigKey;
  value: string;
};

export class SqlLoaded {
  save: (loaded: Loaded) => void;
  read: () => Loaded;

  close: () => void;

  constructor(db: Database) {
    const assemblyTable = new SqlTable<Assembly>(db, "assembly", "name", () => false, {
      name: "foo",
      references: "bar",
    });
    const typeTable = new SqlTable<Type>(db, "type", "name", () => false, {
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
  }
}

export class SqlConfig {
  getConfig: () => ConfigPair[];
  setConfig: (config: ConfigPair) => void;
  done: () => void;

  constructor(db: Database) {
    const configTable = new SqlTable<ConfigPair>(db, "config", "name", () => false, {
      name: "dataSource",
      value: "bar",
    });

    this.getConfig = () => configTable.selectAll();
    this.setConfig = (config: ConfigPair) => configTable.upsert(config);

    this.done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
      db.close();
    };
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
