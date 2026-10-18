import { DataSource } from "backend-app";
import { createSqlDotNet } from "sut/openDataSource/createSqlDotNet";
import { getDbFilename } from "sut/openDataSource/getDbFilename";
import { Sql } from "sut/sql2";
import { deleteFileSync } from "sut/utils";
import { fileCoreJson } from "./paths";

export const createDotNetTables = async (deleteDb: boolean): Promise<Sql.Tables> => {
  const dataSource: DataSource = { path: fileCoreJson, type: "coreJson" };
  if (deleteDb) {
    const filename = getDbFilename(dataSource);
    deleteFileSync(filename);
  }
  return await createSqlDotNet(dataSource);
};
