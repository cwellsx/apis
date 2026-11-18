import { DataSource } from "../contracts-app";
import { getAppFilename } from "../utils";
import { hash } from "./hash";

export const getFilename = (dataSource: DataSource, ext: string) =>
  getAppFilename(`${dataSource.type}-${hash(dataSource.path)}.${ext}`);

// used by unit-test to delete the database before each test run
export const getDbFilename = (dataSource: DataSource): string => getFilename(dataSource, "db");
