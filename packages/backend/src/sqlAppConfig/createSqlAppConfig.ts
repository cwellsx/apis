import { createSqlDatabase } from "sqlio";
import { AppConfig } from "../contracts-app";
import { getAppFilename, getSqlNodePath, log } from "../utils";
import { AppConfigImpl } from "./appConfigImpl";

export function createSqlAppConfig(filename: string): AppConfig {
  filename = getAppFilename(filename);
  log("createSqlConfig: " + filename);
  return new AppConfigImpl(createSqlDatabase(filename, getSqlNodePath()));
}
