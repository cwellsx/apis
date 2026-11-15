import { DataSource } from "../contracts-app";
import { createCustomSelectedView, SelectedView } from "../presenter";
import { createSqlCustom } from "./createSqlCustom";

export const openFromCustom = async (dataSource: DataSource): Promise<SelectedView> => {
  const tables = await createSqlCustom(dataSource);
  return createCustomSelectedView(tables);
};
