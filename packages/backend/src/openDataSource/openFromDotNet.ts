import { DataSource } from "../contracts-app";
import { SelectedView } from "../presenter";
import { createDotnetSelectedView } from "./createDotnetSelectedView";
import { createSqlDotNet } from "./createSqlDotNet";

export const openFromDotNet = async (dataSource: DataSource): Promise<SelectedView> => {
  const tables = await createSqlDotNet(dataSource);
  return createDotnetSelectedView(tables);
};
