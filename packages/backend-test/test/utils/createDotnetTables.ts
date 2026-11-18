import { DataSource } from "backend-app";
import { createSqlDotnet } from "sut/openDotnet";
import { getDbFilename, getFilename } from "sut/open/getDbFilename";
import { Sql } from "sut/sqlDotnet";
import { deleteFileSync } from "sut/utils";
import { fileCoreJson } from "./paths";

export const createDotnetTables = async (deleteDb: boolean): Promise<Sql.Tables> => {
  const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
  if (deleteDb) {
    const filename = getDbFilename(dataSource);
    deleteFileSync(filename);
  }
  return await createSqlDotnet(dataSource, getDbFilename(dataSource), getFilename(dataSource, "json"));
};
