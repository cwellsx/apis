import { MainApiAsync } from "../contracts-app";
import { createCustomWindow } from "../input";
import { showCustom } from "../output";
import { createSqlCustomFromJson } from "../sql";
import { RuntimeContext } from "./runtimeContext";

export const openCustomJson = async (runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const { dataSource, display, appConfig, setMenuItems } = runtimeContext;
  const sqlCustom = await createSqlCustomFromJson(dataSource);
  const show = showCustom(display, sqlCustom);
  return await createCustomWindow(sqlCustom, appConfig, show, setMenuItems);
};
