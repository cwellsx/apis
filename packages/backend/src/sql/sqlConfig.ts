import { SqlDatabase } from "sqlio";
import { AppOptions, defaultAppOptions } from "../contracts-ui";
import { jsonParse, log } from "../utils";
import { ConfigCache } from "./configCache";

export type DataSourceType = "loadedAssemblies" | "customJson" | "coreJson";

export type DataSource = {
  path: string;
  type: DataSourceType;
  hash: string;
};

type RecentColumns = {
  path: string;
  type: DataSourceType;
  when: number;
};

export class SqlConfig {
  private _cache: ConfigCache;
  private _db: SqlDatabase;
  recent: () => RecentColumns[];
  private upsertRecent: (recentColumns: RecentColumns) => void;

  constructor(db: SqlDatabase) {
    this._cache = new ConfigCache(db);
    this._db = db;

    const recentTable = db.newSqlTable<RecentColumns>("recent", "path", () => false, {
      path: "foo",
      type: "loadedAssemblies",
      when: 0,
    });

    this.recent = () => recentTable.selectAll();
    this.upsertRecent = (recentColumns: RecentColumns) => recentTable.upsert(recentColumns);
  }

  get dataSource(): DataSource | undefined {
    const value = this._cache.getValue("dataSource");
    return value ? jsonParse<DataSource>(value) : undefined;
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
    return value ? { ...defaultAppOptions, ...jsonParse(value) } : defaultAppOptions;
  }

  close() {
    const result = this._db.done();
    log(`wal_checkpoint: ${JSON.stringify(result)}`);
    this._db.close();
  }
}
