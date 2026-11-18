import { DataSource } from "../contracts-app";
import { SelectedView } from "../presenter";
import { createDotnetSelectedView } from "./createDotnetSelectedView";
import { createSqlDotnet } from "./createSqlDotnet";

export const openFromDotnet = async (
  dataSource: DataSource,
  dbFilename: string,
  jsonFilename: string
): Promise<SelectedView> => {
  const tables = await createSqlDotnet(dataSource, dbFilename, jsonFilename);
  return createDotnetSelectedView(tables);
};
