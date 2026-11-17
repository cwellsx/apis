import { DataSource } from "../contracts-app";
import { SelectedView } from "../presenter";
import { createCustomSelectedView } from "./createCustomSelectedView";
import { createSqlCustom } from "./createSqlCustom";

export const openFromCustom = async (dataSource: DataSource): Promise<SelectedView> => {
  const tables = await createSqlCustom(dataSource);
  return createCustomSelectedView(tables);
};
