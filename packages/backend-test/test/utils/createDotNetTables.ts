import { DataSource } from "backend-app";
import { createSqlDotNet } from "sut/openDotnet";
import { getDbFilename, getFilename } from "sut/open/getDbFilename";
import { Sql } from "sut/sqlDotNet";
import { deleteFileSync } from "sut/utils";
import { fileCoreJson } from "./paths";

export const createDotNetTables = async (deleteDb: boolean): Promise<Sql.Tables> => {
  const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
  if (deleteDb) {
    const filename = getDbFilename(dataSource);
    deleteFileSync(filename);
  }
  return await createSqlDotNet(dataSource, getDbFilename(dataSource), getFilename(dataSource, "json"));
};
