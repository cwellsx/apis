import { DataSource, MainApiAsync, RuntimeContext } from "../contracts-app";
import { createMainApi, DotnetSelectedView } from "../viewModel";
import { createSqlDotNet } from "./createSqlDotNet";

export const openFromCustom = async (dataSource: DataSource, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const tables = await createSqlDotNet(dataSource);
  const selectedView = new DotnetSelectedView(tables, runtimeContext.setMenuItems);
  return await createMainApi(selectedView, runtimeContext);
};
