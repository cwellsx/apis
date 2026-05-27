import { Database, Statement } from "better-sqlite3";

// this is an application-independent wrapper which encapsulate the better-sqlite3 API
// could support https://www.sqlite.org/withoutrowid.html but records for this application include JSON so they're large

type columnType = "TEXT" | "INTEGER" | "REAL";

function getColumnType(value: unknown): columnType {
  switch (typeof value) {
    case "string":
      return "TEXT";
    case "number":
      return Number.isInteger(value) ? "INTEGER" : "REAL";
    case "bigint":
      return "INTEGER";
    case "object":
      return "TEXT";
    case "boolean":
      throw new Error("boolean not nsupported so use `0 | 1` type instead");
    default:
      throw new Error("Unsupported type");
  }
}

function getColumnDefinition(entry: [string, unknown], constraint: string): string {
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
const sqlJson = <T extends object>(t: T): { toSql: (t: T) => object; fromSql: (t: unknown) => T } => {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      keys.forEach((key) => (result[key] = JSON.parse(result[key] as string)));
      return result as T;
    };
    return { toSql, fromSql };
  }
};

const detectIntegerMode = (t: object): "bigint" | "number" | "mixed" | "none" => {
  let sawBigint = false;
  let sawNumber = false;

  for (const value of Object.values(t)) {
    if (typeof value === "bigint") sawBigint = true;
    if (typeof value === "number") sawNumber = true;
  }

  return sawBigint && sawNumber ? "mixed" : sawBigint ? "bigint" : sawNumber ? "number" : "none";
};

const needSafeIntegers = (t: object): boolean => {
  switch (detectIntegerMode(t)) {
    case "bigint":
    case "mixed":
      return true;
    case "number":
    case "none":
      return false;
  }
};

export class SqlTable<T extends object> {
  // we need to list of keys in T to create corresponding SQL columns
  // but type info is only available at compile-time, it doesn't exist at run-time
  // so instead this API expects a sample run-time instance of T
  constructor(db: Database, tableName: string, primaryKey: keyof T | (keyof T)[], isNullable: (keyof T)[], t: T) {
    // do everything using arrow functions in the constructor, avoid using this anywhere
    // https://github.com/WiseLibs/better-sqlite3/issues/589#issuecomment-1336812715
    if (typeof primaryKey !== "string" && !Array.isArray(primaryKey)) throw new Error("primaryKey must be a string");
    const primaryKeys = Array.isArray(primaryKey) ? primaryKey.map((key) => String(key)) : [String(primaryKey)];
    if (!primaryKeys.length) throw new Error("must have at least one primaryKey");

    function isKeyNullable(key: string): boolean {
      return isNullable.includes(key as keyof T);
    }

    const useSafeIntegers = needSafeIntegers(t);

    const entries = Object.entries(t) as [string, unknown][];
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
    const updateStmt = keys.length ? db.prepare(update) : undefined;

    const insertAuto = `INSERT INTO "${tableName}" (${quoteAndJoin(keys)}) VALUES (${values.join(", ")})`;
    const insertAutoStmt = keys.length ? db.prepare(insertAuto) : undefined;

    const upsert = `INSERT OR REPLACE ${insertParameters}`;
    const upsertStmt = db.prepare(upsert);

    const selectStmt = db.prepare(`SELECT * FROM "${tableName}"`);
    if (useSafeIntegers) selectStmt.safeIntegers(true);

    const deleteAllStmt = db.prepare(`DELETE FROM "${tableName}"`);

    const { fromSql, toSql } = sqlJson(t);

    this.insert = db.transaction((t: T) => {
      const u = toSql(t);
      const info = insertStmt.run(u);
      if (info.changes !== 1) throw new Error("insert failed");
      verbose(`inserted row #${info.lastInsertRowid}`);
    });
    this.insertAuto = db.transaction((t: Partial<T>) => {
      const { toSql } = sqlJson(t);
      const u = toSql(t);
      if (!insertAutoStmt) throw new Error("insertAuto undefined");
      const info = insertAutoStmt.run(u);
      if (info.changes !== 1) throw new Error("insert failed");
      verbose(`inserted row #${info.lastInsertRowid}`);
      return BigInt(info.lastInsertRowid);
    });
    this.update = db.transaction((t: T) => {
      const u = toSql(t);
      if (!updateStmt) throw new Error("update undefined");
      const info = updateStmt.run(u);
      if (info.changes !== 1) throw new Error("update failed");
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

    this.selectWhereIn = <K extends keyof T>(key: K, values: readonly NonNullable<T[K]>[]): T[] => {
      if (values.length === 0) return [];

      const placeholders = values.map(() => "?").join(",");
      const sql = `SELECT * FROM "${tableName}" WHERE "${String(key)}" IN (${placeholders})`;

      return db
        .prepare(sql)
        .all(...values)
        .map(fromSql);
    };

    this.join = <U extends object>(
      other: SqlTable<U>,
      foreignKey: keyof U & string,
      localKey: keyof T & string,
      options?: { optional?: boolean }
    ): JoinQuery<T & U> => {
      return new JoinQuery(
        db,
        [
          {
            leftTable: tableName,
            rightTable: other.tableName,
            leftKey: localKey,
            rightKey: foreignKey,
            optional: !!options?.optional,
          },
        ],
        [],
        [],
        false,
        this.useSafeIntegers || other.useSafeIntegers
      );
    };

    this.tableName = tableName;
    this.useSafeIntegers = useSafeIntegers;
  }

  insert: (t: T) => void;
  insertAuto: (t: Partial<T>) => bigint;
  update: (t: T) => void;
  upsert: (t: T) => void;
  insertMany: (many: T[]) => void;
  selectAll: () => T[];
  deleteAll: () => void;
  selectWhere: (where: Partial<T>) => T[];
  selectOne: (where: Partial<T>) => T | undefined;
  selectCustom: (distinct: boolean, custom: string, where?: object) => T[];
  selectCustomSpecific: (u: Partial<T>, distinct: boolean, custom: string, where?: object) => Partial<T>[];
  selectWhereIn: <K extends keyof T>(key: K, values: readonly NonNullable<T[K]>[]) => T[];

  join: <U extends object>(
    other: SqlTable<U>,
    foreignKey: keyof U & string,
    localKey: keyof T & string,
    options?: { optional?: boolean }
  ) => JoinQuery<T & U>;

  tableName: string;
  useSafeIntegers: boolean;
}

type Join = {
  leftTable: string;
  rightTable: string;
  leftKey: string;
  rightKey: string;
  optional: boolean;
  leftAlias?: string;
  rightAlias?: string;
};

// this creates a new prepared statement just in time
// cost to create an prepared statement is independent of table size
// but might want to change this in future to return a reusable prepared statement, if this is called frequently by users at run-time
class JoinQuery<T extends object> {
  constructor(
    private readonly db: Database,
    private readonly joins: Join[],
    private readonly whereClauses: string[],
    private readonly whereParams: unknown[],
    private readonly isDistinct: boolean,
    private readonly useSafeIntegers: boolean // default is true if any table in the join has useSafeIntegers
  ) {}

  join<U extends object, L extends object>(
    other: SqlTable<U>,
    foreignKey: keyof U & string,
    localTable: SqlTable<L>, // one of the existing tables in T
    localKey: keyof L & string,
    options?: { optional?: boolean; leftAlias?: string; rightAlias?: string }
  ): JoinQuery<T & U> {
    return new JoinQuery(
      this.db,
      [
        ...this.joins,
        {
          leftTable: localTable.tableName,
          rightTable: other.tableName,
          leftKey: localKey,
          rightKey: foreignKey,
          optional: !!options?.optional,
          leftAlias: options?.leftAlias,
          rightAlias: options?.rightAlias,
        },
      ],
      this.whereClauses,
      this.whereParams,
      this.isDistinct,
      this.useSafeIntegers || other.useSafeIntegers
    );
  }

  distinct(): JoinQuery<T> {
    return new JoinQuery(this.db, this.joins, this.whereClauses, this.whereParams, true, this.useSafeIntegers);
  }

  where(clause: string, ...params: unknown[]): JoinQuery<T> {
    return new JoinQuery(
      this.db,
      this.joins,
      [...this.whereClauses, clause],
      [...this.whereParams, ...params],
      this.isDistinct,
      this.useSafeIntegers
    );
  }

  safeIntegers(b: boolean): JoinQuery<T> {
    return new JoinQuery(this.db, this.joins, this.whereClauses, this.whereParams, true, b);
  }

  selectAll<R extends object>(columns: Record<keyof R, string>): R[] {
    const selectSql = Object.entries(columns as Record<string, string>)
      .map(([alias, expr]) => `${expr} AS ${alias}`)
      .join(", ");

    const selectKeyword = this.isDistinct ? "SELECT DISTINCT" : "SELECT";

    const nameAsAlias = (name: string, alias: string | undefined): string => (alias ? `${name} AS ${alias}` : name);
    const nameOrAlias = (name: string, alias: string | undefined): string => (alias ? alias : name);

    const leftNameAsAlias = nameAsAlias(this.joins[0].leftTable, this.joins[0].leftAlias);
    let sql = `${selectKeyword} ${selectSql} FROM ${leftNameAsAlias}`;

    for (const j of this.joins) {
      const joinType = j.optional ? "LEFT JOIN" : "JOIN";
      const rightNameAsAlias = nameAsAlias(j.rightTable, j.rightAlias);
      const leftAlias = nameOrAlias(j.leftTable, j.leftAlias);
      const rightAlias = nameOrAlias(j.rightTable, j.rightAlias);
      sql += ` ${joinType} ${rightNameAsAlias} ON ${leftAlias}.${j.leftKey} = ${rightAlias}.${j.rightKey}`;
    }

    if (this.whereClauses.length > 0) {
      sql += " WHERE " + this.whereClauses.join(" AND ");
    }

    const prepared = this.db.prepare(sql);
    if (this.useSafeIntegers) prepared.safeIntegers(true);
    return prepared.all(...this.whereParams) as R[];
  }
}
