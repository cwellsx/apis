import { getAppFilename } from "../fs";
import { log } from "../log";
import type { DataSource } from "./sqlConfig";
import { SqlConfig } from "./sqlConfig";
import { SqlCustom } from "./sqlCustom";
import { createSqlDatabase } from "./sqlDatabase";
import { SqlLoaded } from "./sqlLoaded";

export function createSqlLoaded(dataSource: DataSource): SqlLoaded {
  log("createSqlLoaded");
  return new SqlLoaded(createSqlDatabase(getAppFilename(`${dataSource.type}-${dataSource.hash}.db`)));
}

export function createSqlCustom(dataSource: DataSource): SqlCustom {
  log("createSqlCustom");
  return new SqlCustom(createSqlDatabase(getAppFilename(`${dataSource.type}-${dataSource.hash}.db`)));
}

export function createSqlConfig(filename: string): SqlConfig {
  log("createSqlConfig");
  return new SqlConfig(createSqlDatabase(getAppFilename(filename)));
}
