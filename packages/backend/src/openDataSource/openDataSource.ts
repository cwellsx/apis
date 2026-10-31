import type { DataSource, OpenDataSource, ShowProgress } from "../contracts-app";
import { log } from "../utils";
import { createPresenter, SelectedView } from "../viewModel";
import { openFromCustom } from "./openFromCustom";
import { openFromDotNet } from "./openFromDotNet";
import { wrapPresenterApi } from "./wrapPresenterApi";

/*
  openDataSource to open any and all types of DataSource
*/

const getSelectedView = async (dataSource: DataSource): Promise<SelectedView> => {
  switch (dataSource.type) {
    case "loadedAssemblies":
    case "coreJson":
      return await openFromDotNet(dataSource);

    case "customJson":
      return openFromCustom(dataSource);
  }
};

export const openDataSource = async (dataSource: DataSource, showProgress: ShowProgress): Promise<OpenDataSource> => {
  const path = dataSource.path;
  log(`openDataSource: ${path}`);
  showProgress(`Loading ${path}`, "Loading...");

  const selectedView = await getSelectedView(dataSource);
  const result = await createPresenter(selectedView);
  result.presenterApi = wrapPresenterApi(result.presenterApi);
  return result;
};
