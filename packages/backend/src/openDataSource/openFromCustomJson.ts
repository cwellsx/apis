import type { DataSource, MainApiAsync, RuntimeContext } from "../contracts-app";
import { createCustomWindow } from "../input";
import { showCustom } from "../output";
import { createSqlCustomFromJson } from "../sql";

export const openCustomJson = async (dataSource: DataSource, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const { display, appConfig, setMenuItems } = runtimeContext;
  const sqlCustom = await createSqlCustomFromJson(dataSource);
  const show = showCustom(display, sqlCustom);
  return await createCustomWindow(sqlCustom, appConfig, show, setMenuItems);
};
