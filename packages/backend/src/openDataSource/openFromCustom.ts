import { DataSource } from "../contracts-app";
import { CustomSelectedView, SelectedView } from "../viewModel";
import { createSqlCustom } from "./createSqlCustom";

export const openFromCustom = async (dataSource: DataSource): Promise<SelectedView> => {
  const tables = await createSqlCustom(dataSource);
  return new CustomSelectedView(tables);
};
