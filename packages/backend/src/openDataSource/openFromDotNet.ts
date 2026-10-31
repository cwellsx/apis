import { DataSource } from "../contracts-app";
import { DotnetSelectedView, SelectedView } from "../viewModel";
import { createSqlDotNet } from "./createSqlDotNet";

export const openFromDotNet = async (dataSource: DataSource): Promise<SelectedView> => {
  const tables = await createSqlDotNet(dataSource);
  return new DotnetSelectedView(tables);
};
