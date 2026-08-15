import type { AppConfig, DataSource, DisplayApi, MainApiAsync, SecondDisplay, SetMenuItems } from "./contracts-app";
import { createAppWindow, createCustomWindow } from "./input";
import { MethodNodeId } from "./nodeIds";
import { ShowBase, showCustom, showReflected } from "./output";
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
  setMenuItems: SetMenuItems,
  appConfig: AppConfig
): Promise<MainApiAsync> => {
  type Tuple = [MainApiAsync, ShowBase];

  const openAppWindow = async (sqlLoaded: SqlLoaded): Promise<Tuple> => {
    const showMethod = async (methodNodeId: MethodNodeId): Promise<void> => {
      const secondDisplay: SecondDisplay = (newDisplay: DisplayApi): Promise<MainApiAsync> => {
        const newShow = showReflected(newDisplay, sqlLoaded);
        return createAppWindow(sqlLoaded, appConfig, newShow, setMenuItems, showMethod, methodNodeId);
      };
      await display.createSecondDisplay(secondDisplay);
    };

    const show = showReflected(display, sqlLoaded);
    const mainApi = await createAppWindow(sqlLoaded, appConfig, show, setMenuItems, showMethod, undefined);
    return [mainApi, show];
  };

  const openCustomWindow = async (sqlCustom: SqlCustom): Promise<Tuple> => {
    const show = showCustom(display, sqlCustom);
    const mainApi = await createCustomWindow(sqlCustom, appConfig, show, setMenuItems);
    return [mainApi, show];
  };

  // log the API
  if (options.logApi) display = wrapApi("send", display);

  log("openDataSource");
  const path = dataSource.path;
  display.showLoadingMessage(`Loading ${path}`, "Loading...");
  log(`openDataSource: ${path}`);

  let tuple: Tuple;
  switch (dataSource.type) {
    case "loadedAssemblies":
      tuple = await openAppWindow(await createSqlLoadedFromDotNet(dataSource));
      break;

    case "coreJson":
      tuple = await openAppWindow(await createSqlLoadedFromCoreJson(dataSource));
      break;

    case "customJson":
      tuple = await openCustomWindow(await createSqlCustomFromJson(dataSource));
      break;
  }

  const [mainApi, show] = tuple;

  // log the API
  const result: MainApiAsync = options.logApi ? wrapApi("on", mainApi) : mainApi;

  await show.showAppOptions(appConfig.appOptions);

  // remember as most-recently-opened iff it opens successfully
  appConfig.dataSource = dataSource;

  return result;
};
