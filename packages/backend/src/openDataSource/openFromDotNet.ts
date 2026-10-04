import { DataSource, MainApiAsync, RuntimeContext } from "../contracts-app";
import { createMainApi, DotnetSelectedView } from "../viewModel";
import { createSqlCore } from "./createSqlCore";

export const openFromDotNet = async (dataSource: DataSource, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const tables = await createSqlCore(dataSource);
  const selectedView = new DotnetSelectedView(tables, runtimeContext.setMenuItems);
  return await createMainApi(selectedView, runtimeContext);
};
