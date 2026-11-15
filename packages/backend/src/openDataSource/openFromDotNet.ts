import { DataSource } from "../contracts-app";
import { createDotnetSelectedView, SelectedView } from "../presenter";
import { createSqlDotNet } from "./createSqlDotNet";

export const openFromDotNet = async (dataSource: DataSource): Promise<SelectedView> => {
  const tables = await createSqlDotNet(dataSource);
  return createDotnetSelectedView(tables);
};
