import { DataSource, SetMenuItems } from "../contracts-app";
import { PresenterApi } from "../contracts-ui";
import { createPresenter, CustomSelectedView } from "../viewModel";
import { createSqlCustom } from "./createSqlCustom";

export const openFromCustom = async (dataSource: DataSource, setMenuItems: SetMenuItems): Promise<PresenterApi> => {
  const tables = await createSqlCustom(dataSource);
  const selectedView = new CustomSelectedView(tables, setMenuItems);
  return createPresenter(selectedView);
};
