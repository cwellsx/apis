import { log } from "../log";
import { SqlConfig } from "./sqlConfig";
import { SqlCustom } from "./sqlCustom";
import { createSqlDatabase } from "./sqlDatabase";
import { SqlLoaded } from "./sqlLoaded";

export function createSqlLoaded(filename: string): SqlLoaded {
  log("createSqlLoaded");
  return new SqlLoaded(createSqlDatabase(filename));
}

export function createSqlCustom(filename: string): SqlCustom {
  log("createSqlCustom");
  return new SqlCustom(createSqlDatabase(filename));
}

export function createSqlConfig(filename: string): SqlConfig {
  log("createSqlConfig");
  return new SqlConfig(createSqlDatabase(filename));
}
