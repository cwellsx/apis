import { createSqlDatabase } from "sqlio";
import type { AppConfig, DataSource } from "../contracts-app";
import { getAppFilename, log, pathJoin } from "../utils";
import { SqlConfig } from "./sqlConfig";
import { SqlCustom } from "./sqlCustom";
import { SqlLoaded } from "./sqlLoaded";

const nativeBinding = pathJoin(process.cwd(), ".webpack\\main\\native_modules\\build\\Release\\better_sqlite3.node");

export function createSqlLoaded(dataSource: DataSource): SqlLoaded {
  const filename = getAppFilename(`${dataSource.type}-${dataSource.hash}.db`);
  log("createSqlLoaded: " + filename);
  return new SqlLoaded(createSqlDatabase(filename, nativeBinding));
}

export function createSqlCustom(dataSource: DataSource): SqlCustom {
  const filename = getAppFilename(`${dataSource.type}-${dataSource.hash}.db`);
  log("createSqlCustom: " + filename);
  return new SqlCustom(createSqlDatabase(filename, nativeBinding));
}

export function createSqlConfig(filename: string): AppConfig {
  filename = getAppFilename(filename);
  log("createSqlConfig: " + filename);
  return new SqlConfig(createSqlDatabase(filename, nativeBinding));
}
