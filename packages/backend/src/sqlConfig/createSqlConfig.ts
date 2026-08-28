import { createSqlDatabase } from "sqlio";
import { AppConfig } from "../contracts-app";
import { getAppFilename, getSqlNodePath, log } from "../utils";
import { SqlConfig } from "./sqlConfig";

export function createSqlConfig(filename: string): AppConfig {
  filename = getAppFilename(filename);
  log("createSqlConfig: " + filename);
  return new SqlConfig(createSqlDatabase(filename, getSqlNodePath()));
}
