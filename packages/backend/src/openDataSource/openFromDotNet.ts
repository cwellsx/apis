import { DataSource, SetMenuItems } from "../contracts-app";
import { PresenterApi } from "../contracts-ui";
import { createPresenter, DotnetSelectedView } from "../viewModel";
import { createSqlDotNet } from "./createSqlDotNet";

export const openFromDotNet = async (dataSource: DataSource, setMenuItems: SetMenuItems): Promise<PresenterApi> => {
  const tables = await createSqlDotNet(dataSource);
  const selectedView = new DotnetSelectedView(tables, setMenuItems);
  return createPresenter(selectedView);
};
