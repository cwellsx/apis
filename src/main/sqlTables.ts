import { Database } from "better-sqlite3";

import { Loaded, IStrings, ITypes } from "../shared-types";
import { createSqlDatabase } from "./createSqlDatabase";
import { log } from "./log";
import { SqlTable } from "./sqlTable";

type Assembly = {
  name: string;
  references: string;
};

type Type = {
  name: string;
  typeInfo: string;
};

export class SqlTables {
  save: (loaded: Loaded) => void;
  read: () => Loaded;
  done: () => void;

  constructor(db: Database) {
    const assemblyTable = new SqlTable<Assembly>(db, "assembly", "name", () => false, {
      name: "foo",
      references: "bar",
    });
    const typeTable = new SqlTable<Type>(db, "type", "name", () => false, {
      name: "foo",
      typeInfo: "bar",
    });

    this.save = (loaded: Loaded) => {
      assemblyTable.deleteAll();
      for (const key in loaded.assemblies)
        assemblyTable.insert({ name: key, references: JSON.stringify(loaded.assemblies[key]) });
      typeTable.deleteAll();
      for (const key in loaded.types) typeTable.insert({ name: key, typeInfo: JSON.stringify(loaded.types[key]) });
      this.done();
    };

    this.read = () => {
      const assemblies: IStrings = {};
      const types: ITypes = {};
      assemblyTable.selectAll().forEach((assembly) => (assemblies[assembly.name] = JSON.parse(assembly.references)));
      typeTable.selectAll().forEach((type) => (types[type.name] = JSON.parse(type.typeInfo)));
      return { assemblies, types };
    };

    this.done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };
  }
}

export function createSqlTables(filename: string): SqlTables {
  return new SqlTables(createSqlDatabase(filename));
}
