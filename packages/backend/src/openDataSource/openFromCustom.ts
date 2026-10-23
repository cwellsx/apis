import { DataSource, MainApiAsync, RuntimeContext } from "../contracts-app";
import { createMainApi, CustomSelectedView } from "../viewModel";
import { createSqlCustom } from "./createSqlCustom";

export const openFromCustom = async (dataSource: DataSource, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const tables = await createSqlCustom(dataSource);
  const selectedView = new CustomSelectedView(tables, runtimeContext.setMenuItems);
  return await createMainApi(selectedView, runtimeContext);
};
