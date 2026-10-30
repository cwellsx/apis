import type { DataSource, SetMenuItems, ShowLoadingMessage } from "../contracts-app";
import { PresenterApi } from "../contracts-ui";
import { log } from "../utils";
import { openFromCustom } from "./openFromCustom";
import { openFromDotNet } from "./openFromDotNet";
import { wrapPresenterApi } from "./wrapPresenterApi";

/*
  openDataSource to open any and all types of DataSource
*/

export const openDataSource = async (
  dataSource: DataSource,
  setMenuItems: SetMenuItems,
  showLoadingMessage: ShowLoadingMessage
): Promise<PresenterApi> => {
  log("openDataSource");
  const path = dataSource.path;
  showLoadingMessage(`Loading ${path}`, "Loading...");
  log(`openDataSource: ${path}`);

  switch (dataSource.type) {
    case "loadedAssemblies":
    case "coreJson":
      return wrapPresenterApi(await openFromDotNet(dataSource, setMenuItems));

    case "customJson":
      return wrapPresenterApi(await openFromCustom(dataSource, setMenuItems));
  }
};
