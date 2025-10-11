import sqlite, { Database } from "better-sqlite3";
import fs from "fs";
import path from "path";
import { SqlTable } from "./sqlTable";

// https://github.com/electron-userland/electron-forge/issues/1224#issuecomment-606649565
// https://www.npmjs.com/package/better-sqlite3
// https://github.com/electron-userland/electron-forge/issues?q=is%3Aissue+is%3Aopen+sqlite
// https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md

export class SqlDatabase {
  constructor(public db: Database) {
    this.newSqlTable = <T extends object>(
      tableName: string,
      primaryKey: keyof T | (keyof T)[],
      isNullable: ((key: keyof T) => boolean) | boolean,
      t: T
    ): SqlTable<T> => {
      return new SqlTable(this.db, tableName, primaryKey, isNullable, t);
    };

    this.dropTable = (tableName: string) => {
      const source = `DROP TABLE IF EXISTS "${tableName}"`;
      this.db.prepare(source).run();
    };

    this.done = () => {
      db.pragma("wal_checkpoint(TRUNCATE)");
    };
    this.close = () => {
      db.close();
    };
  }

  newSqlTable: <T extends object>(
    tableName: string,
    primaryKey: keyof T | (keyof T)[],
    isNullable: ((key: keyof T) => boolean) | boolean,
    t: T
  ) => SqlTable<T>;

  dropTable: (tableName: string) => void;
  done: () => void;
  close: () => void;
}

export function createSqlDatabase(filename: string): SqlDatabase {
  // specify location of better_sqlite3.node -- https://github.com/electron/forge/issues/3052
  const nativeBinding = path.join(process.cwd(), ".webpack\\main\\native_modules\\build\\Release\\better_sqlite3.node");
  const options: sqlite.Options | undefined = fs.existsSync(nativeBinding)
    ? {
        nativeBinding,
      }
    : undefined;

  const db = sqlite(filename, options);
  db.pragma("locking_mode = EXCLUSIVE");
  // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/performance.md
  db.pragma("journal_mode = WAL");
  return new SqlDatabase(db);
}
