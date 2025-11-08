import type { AppConfig, DataSource, DisplayApi, MainApiAsync } from "./contracts-app";
import { SetViewMenu } from "./contracts-app";
import { createAppWindow } from "./createAppWindow";
import { createCustomWindow } from "./createCustomWindow";
import {
  createSqlCustomFromJson,
  createSqlLoadedFromCoreJson,
  createSqlLoadedFromDotNet,
  SqlCustom,
  SqlLoaded,
} from "./sql";
import { log, options, wrapApi } from "./utils";

/*
  openDataSource to open any and all types of DataSource
*/

export const openDataSource = async (
  dataSource: DataSource,
  display: DisplayApi,
  setViewMenu: SetViewMenu,
  appConfig: AppConfig
): Promise<MainApiAsync | undefined> => {
  /*
    statements wrapped in a try/catch handler
  */

  const openAppWindow = async (sqlLoaded: SqlLoaded): Promise<MainApiAsync> =>
    await createAppWindow(display, sqlLoaded, appConfig, dataSource.path, setViewMenu, {
      kind: "openViewType",
    });

  const openCustomWindow = async (sqlCustom: SqlCustom): Promise<MainApiAsync> =>
    await createCustomWindow(display, sqlCustom, appConfig, dataSource.path, setViewMenu);

  // log the API
  if (options.logApi) display = wrapApi("send", display);

  try {
    log("openDataSource");
    const path = dataSource.path;
    display.showMessage(`Loading ${path}`, "Loading...");
    log(`openDataSource: ${path}`);

    let result: MainApiAsync;
    switch (dataSource.type) {
      case "loadedAssemblies":
        result = await openAppWindow(await createSqlLoadedFromDotNet(dataSource));
        break;

      case "coreJson":
        result = await openAppWindow(await createSqlLoadedFromCoreJson(dataSource));
        break;

      case "customJson":
        result = await openCustomWindow(await createSqlCustomFromJson(dataSource));
        break;
    }

    // log the API
    if (options.logApi) result = wrapApi("on", result);

    // remember as most-recently-opened iff it opens successfully
    appConfig.dataSource = dataSource;
    return result;
  } catch (error: unknown) {
    display.showException(error);
    return undefined;
  }
};
