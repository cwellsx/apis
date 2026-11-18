import type { DataSource, OpenDataSource, ShowProgress } from "../contracts-app";
import { createPresenter, SelectedView } from "../presenter";
import { log } from "../utils";
import { openFromCustom } from "../openCustom";
import { openFromDotNet } from "../openDotnet";
import { wrapPresenterApi } from "./wrapPresenterApi";
import { getDbFilename, getFilename } from "./getDbFilename";

/*
  openDataSource to open any and all types of DataSource
*/

const getSelectedView = async (dataSource: DataSource): Promise<SelectedView> => {
  const dbFilename = getDbFilename(dataSource);
  const jsonFilename = getFilename(dataSource, "json");
  switch (dataSource.type) {
    case "loadedAssemblies":
    case "coreJson":
      return await openFromDotNet(dataSource, dbFilename, jsonFilename);

    case "customJson":
      return openFromCustom(dataSource, dbFilename);
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
