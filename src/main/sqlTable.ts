import { Database } from "better-sqlite3";

// this is an application-independent wrapper which encapsulate the better-sqlite3 API

type columnType = "TEXT" | "INT" | "REAL";

function getColumnType(value: unknown): columnType {
  switch (typeof value) {
    case "string":
      return "TEXT";
    case "boolean":
      return "INT";
    case "number":
      return Number.isInteger(value) ? "INT" : "REAL";
    default:
      throw new Error("Unsupported type");
  }
}

function getColumnDefinition(entry: [string, undefined], constraint: string): string {
  return `"${entry[0]}" ${getColumnType(entry[1])} ${constraint}`;
}

const isVerbose = false;
function verbose(message: string) {
  if (isVerbose) console.log(message);
}

function quoteAndJoin(ids: string[]) {
  return ids.map((id) => `"${id}"`).join(", ");
}

export class SqlTable<T extends object> {
  // we need to list of keys in T to create corresponding SQL columns
  // but type info is only available at compile-time, it doesn't exist at run-time
  // so instead this API expects a sample run-time instance of T
  constructor(
    db: Database,
    tableName: string,
    primaryKey: keyof T | (keyof T)[],
    isNullable: ((key: keyof T) => boolean) | boolean,
    t: T
  ) {
    // do everything using arrow functions in the constructor, avoid using this anywhere
    // https://github.com/WiseLibs/better-sqlite3/issues/589#issuecomment-1336812715
    if (typeof primaryKey !== "string" && !Array.isArray(primaryKey)) throw new Error("primaryKey must be a string");
    const primaryKeys = Array.isArray(primaryKey) ? primaryKey.map((key) => String(key)) : [String(primaryKey)];
    if (!primaryKeys.length) throw new Error("must have at least one primaryKey");

    function isKeyNullable(key: string): boolean {
      if (typeof isNullable === "boolean") return isNullable;
      return isNullable(key as keyof T);
    }

    const entries = Object.entries(t);
    const columnDefs = entries.map((entry) => {
      const key = entry[0];
      const constraint = !isKeyNullable(key) ? "NOT NULL" : "";
      return getColumnDefinition(entry, constraint);
    });
    const primaryKeyConstraint = `PRIMARY KEY (${primaryKeys.join(", ")})`;
    const createTable = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs.join(", ")}, ${primaryKeyConstraint})`;
    db.prepare(createTable).run();

    const keys = Object.keys(t);
    const values = keys.map((key) => `@${key}`);
    const insertParameters = `INTO "${tableName}" (${quoteAndJoin(keys)}) VALUES (${values.join(", ")})`;
    const insert = `INSERT ${insertParameters}`;
    const insertStmt = db.prepare(insert);

    primaryKeys.forEach((primaryKey) => {
      const index = keys.indexOf(primaryKey);
      if (index === -1) throw new Error("primaryKey not found");
      keys.splice(index, 1);
      values.splice(index, 1);
    });
    const where = primaryKeys.map((primaryKey) => `"${primaryKey}" = @${primaryKey}`).join(" AND ");
    const update = `UPDATE ${tableName} SET (${quoteAndJoin(keys)}) = (${values.join(", ")}) WHERE ${where}`;
    const updateStmt = db.prepare(update);

    const upsert = `INSERT OR REPLACE ${insertParameters}`;
    const upsertStmt = db.prepare(upsert);

    const selectStmt = db.prepare(`SELECT * FROM "${tableName}"`);
    const deleteAllStmt = db.prepare(`DELETE FROM "${tableName}"`);

    this.insert = db.transaction((t: T) => {
      const info = insertStmt.run(t);
      if (info.changes !== 1) throw new Error("insert failed");
      verbose(`inserted row #${info.lastInsertRowid}`);
    });
    this.update = db.transaction((t: T) => {
      const info = updateStmt.run(t);
      if (info.changes !== 1) throw new Error("insert failed");
      verbose(`updated row #${info.lastInsertRowid}`);
    });
    this.upsert = db.transaction((t: T) => {
      const info = upsertStmt.run(t);
      if (info.changes !== 1) throw new Error("upsert failed");
      verbose(`upserted row #${info.lastInsertRowid}`);
    });
    this.insertMany = db.transaction((many: T[]) => {
      for (const t of many) insertStmt.run(t);
    });
    this.selectAll = () => selectStmt.all() as T[];
    this.deleteAll = db.transaction(() => {
      deleteAllStmt.run();
    });
  }

  insert: (t: T) => void;
  update: (t: T) => void;
  upsert: (t: T) => void;
  insertMany: (many: T[]) => void;
  selectAll: () => T[];
  deleteAll: () => void;
}
