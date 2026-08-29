import { createCustomWindow } from "../input";
import { showCustom } from "../output";
import { createSqlCustomFromJson } from "../sql";
import { RuntimeContext } from "./runtimeContext";
import { Tuple } from "./tuple";

export const openCustomJson = async (runtimeContext: RuntimeContext): Promise<Tuple> => {
  const { dataSource, display, appConfig, setMenuItems } = runtimeContext;
  const sqlCustom = await createSqlCustomFromJson(dataSource);
  const show = showCustom(display, sqlCustom);
  const mainApi = await createCustomWindow(sqlCustom, appConfig, show, setMenuItems);
  return [mainApi, show];
};
