import { Database, Statement } from "better-sqlite3";

// this is an application-independent wrapper which encapsulate the better-sqlite3 API
// could support https://www.sqlite.org/withoutrowid.html but records for this application include JSON so they're large

type columnType = "TEXT" | "INT" | "REAL";

function getColumnType(value: unknown): columnType {
  switch (typeof value) {
    case "string":
      return "TEXT";
    case "boolean":
      return "INT";
    case "number":
      return Number.isInteger(value) ? "INT" : "REAL";
    case "object":
      return "TEXT";
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

export const dropTable = (db: Database, tableName: string): void => {
  const source = `DROP TABLE IF EXISTS "${tableName}"`;
  db.prepare(source).run();
};

// this lets you define columns of type [] and {} which during I/O are automatically converted to/from string using JSON
const sqlJson = <T extends object>(
  t: T
): {
  toSql: (t: T) => object;
  fromSql: (t: unknown) => T;
} => {
  type Stringified = { [key: string]: unknown };

  const keys: string[] = [];
  Object.entries(t).forEach(([key, value]) => {
    if (typeof value === "object") keys.push(key);
  });

  if (!keys.length) {
    const toSql = (t: T) => t;
    const fromSql = (t: unknown) => t as T;
    return { toSql, fromSql };
  } else {
    const toSql = (t: T) => {
      const result = { ...t } as Stringified;
      keys.forEach((key) => (result[key] = JSON.stringify(result[key])));
      return result;
    };
    const fromSql = (t: unknown) => {
      const result = { ...(t as object) } as Stringified;
      keys.forEach((key) => (result[key] = JSON.parse(result[key] as string)));
      return result as T;
    };
    return { toSql, fromSql };
  }
};

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

    const whereKeys = (keys: string[]) => keys.map((key) => `"${key}" = @${key}`).join(" AND ");

    primaryKeys.forEach((primaryKey) => {
      const index = keys.indexOf(primaryKey);
      if (index === -1) throw new Error("primaryKey not found");
      keys.splice(index, 1);
      values.splice(index, 1);
    });
    const wherePrimaryKeys = whereKeys(primaryKeys);
    const update = `UPDATE ${tableName} SET (${quoteAndJoin(keys)}) = (${values.join(", ")}) WHERE ${wherePrimaryKeys}`;
    const updateStmt = db.prepare(update);

    const upsert = `INSERT OR REPLACE ${insertParameters}`;
    const upsertStmt = db.prepare(upsert);

    const selectStmt = db.prepare(`SELECT * FROM "${tableName}"`);
    const deleteAllStmt = db.prepare(`DELETE FROM "${tableName}"`);

    const { fromSql, toSql } = sqlJson(t);

    this.insert = db.transaction((t: T) => {
      const u = toSql(t);
      const info = insertStmt.run(u);
      if (info.changes !== 1) throw new Error("insert failed");
      verbose(`inserted row #${info.lastInsertRowid}`);
    });
    this.update = db.transaction((t: T) => {
      const u = toSql(t);
      const info = updateStmt.run(u);
      if (info.changes !== 1) throw new Error("insert failed");
      verbose(`updated row #${info.lastInsertRowid}`);
    });
    this.upsert = db.transaction((t: T) => {
      const u = toSql(t);
      const info = upsertStmt.run(u);
      if (info.changes !== 1) throw new Error("upsert failed");
      verbose(`upserted row #${info.lastInsertRowid}`);
    });
    this.insertMany = db.transaction((many: T[]) => {
      for (const u of many.map(toSql)) insertStmt.run(u);
    });
    this.selectAll = () => selectStmt.all().map((u) => fromSql(u));
    this.deleteAll = db.transaction(() => deleteAllStmt.run());

    const prepareSelectWhere = (where: Partial<T>): Statement<unknown[]> => {
      const keys = Object.keys(where);
      keys.sort();
      const source = `SELECT * FROM "${tableName}" WHERE ${whereKeys(keys)}`;
      return prepare(source);
    };

    this.selectWhere = (where: Partial<T>): T[] => prepareSelectWhere(where).all(where).map(fromSql);

    this.selectOne = (where: Partial<T>): T | undefined => {
      const u = prepareSelectWhere(where).get(where);
      return u === undefined ? undefined : fromSql(u);
    };

    this.selectCustom = (distinct: boolean, custom: string, where?: object): T[] => {
      const source = `${distinct ? "SELECT DISTINCT" : "SELECT"} * FROM "${tableName}" WHERE ${custom}`;
      const statement = prepare(source);
      return (!where ? statement.all() : statement.all(where)).map(fromSql);
    };

    this.selectCustomSpecific = (u: Partial<T>, distinct: boolean, custom: string, where?: object): Partial<T>[] => {
      const keys = Object.keys(u);
      const source = `${distinct ? "SELECT DISTINCT" : "SELECT"} ${quoteAndJoin(
        keys
      )} FROM "${tableName}" WHERE ${custom}`;
      const statement = prepare(source);
      return (!where ? statement.all() : statement.all(where)).map(fromSql);
    };

    const prepared: { [source: string]: Statement<unknown[]> | undefined } = {};
    const prepare = (source: string): Statement<unknown[]> => {
      let statement = prepared[source];
      if (!statement) {
        statement = db.prepare(source);
        prepared[source] = statement;
      }
      return statement;
    };
  }

  insert: (t: T) => void;
  update: (t: T) => void;
  upsert: (t: T) => void;
  insertMany: (many: T[]) => void;
  selectAll: () => T[];
  deleteAll: () => void;
  selectWhere: (where: Partial<T>) => T[];
  selectOne: (where: Partial<T>) => T | undefined;
  selectCustom: (distinct: boolean, custom: string, where?: object) => T[];
  selectCustomSpecific: (u: Partial<T>, distinct: boolean, custom: string, where?: object) => Partial<T>[];
}
