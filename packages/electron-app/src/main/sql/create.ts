import { createSqlDatabase } from "sqlio";
import { getAppFilename, pathJoin } from "../fs";
import { log } from "../log";
import type { DataSource } from "./sqlConfig";
import { SqlConfig } from "./sqlConfig";
import { SqlCustom } from "./sqlCustom";
import { SqlLoaded } from "./sqlLoaded";

const nativeBinding = pathJoin(process.cwd(), ".webpack\\main\\native_modules\\build\\Release\\better_sqlite3.node");

export function createSqlLoaded(dataSource: DataSource): SqlLoaded {
  log("createSqlLoaded");
  return new SqlLoaded(createSqlDatabase(getAppFilename(`${dataSource.type}-${dataSource.hash}.db`), nativeBinding));
}

export function createSqlCustom(dataSource: DataSource): SqlCustom {
  log("createSqlCustom");
  return new SqlCustom(createSqlDatabase(getAppFilename(`${dataSource.type}-${dataSource.hash}.db`), nativeBinding));
}

export function createSqlConfig(filename: string): SqlConfig {
  log("createSqlConfig");
  return new SqlConfig(createSqlDatabase(getAppFilename(filename), nativeBinding));
}
