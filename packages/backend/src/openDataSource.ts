import type { AppConfig, DataSource, DisplayApi, MainApiAsync, SecondDisplay, ViewMenu } from "./contracts-app";
import { SetViewMenu } from "./contracts-app";
import { AppOptions } from "./contracts-ui";
import { createAppWindow, ShowReflectedEx } from "./createAppWindow";
import { createCustomWindow } from "./createCustomWindow";
import { MethodNodeId } from "./nodeIds";
import { MenuViewTypes, ShowBase, showCustom, showMethods, ShowReflected, showReflected } from "./show";
import {
  createSqlCustomFromJson,
  createSqlLoadedFromCoreJson,
  createSqlLoadedFromDotNet,
  SqlCustom,
  SqlLoaded,
} from "./sql";
import { hookMethod, log, logJson, options, wrapApi } from "./utils";

/*
  openDataSource to open any and all types of DataSource
*/

const getShowReflectedEx = (
  sqlLoaded: SqlLoaded,
  appConfig: AppConfig,
  others: ShowReflected,
  display: DisplayApi
): ShowReflectedEx => {
  // create the delegate which binds DisplayApi to MainApiAsync
  const getDelegate = (methodNodeId: MethodNodeId): SecondDisplay => {
    const delegate = async (newDisplay: DisplayApi): Promise<MainApiAsync> => {
      // bind that to an output API
      const { show, title } = showMethods(newDisplay, sqlLoaded, methodNodeId);
      // extend that API to include method again
      const showEx: ShowReflectedEx = getShowReflectedEx(sqlLoaded, appConfig, show, newDisplay);
      // create a new app window
      const mainApi = createAppWindow(sqlLoaded, appConfig, showEx);
      // display the method
      newDisplay.setTitle(title);
      await show.showViewType();
      return mainApi;
    };
    return delegate;
  };

  return {
    ...others,
    showMethods: async (methodNodeId: MethodNodeId): Promise<void> =>
      await display.createSecondDisplay(getDelegate(methodNodeId)),
  };
};

export const openDataSource = async (
  dataSource: DataSource,
  display: DisplayApi,
  setViewMenu: SetViewMenu,
  appConfig: AppConfig
): Promise<MainApiAsync> => {
  type Tuple = [MainApiAsync, MenuViewTypes, ShowBase];

  const openAppWindow = (sqlLoaded: SqlLoaded): Tuple => {
    const { show, menu } = showReflected(display, sqlLoaded, appConfig, dataSource.path);
    const showEx = getShowReflectedEx(sqlLoaded, appConfig, show, display);
    const mainApi = createAppWindow(sqlLoaded, appConfig, showEx);
    return [mainApi, menu, show];
  };

  const openCustomWindow = (sqlCustom: SqlCustom): Tuple => {
    const { show, menu } = showCustom(display, sqlCustom, appConfig, dataSource.path);
    const mainApi = createCustomWindow(sqlCustom, appConfig, show);
    return [mainApi, menu, show];
  };

  // log the API
  if (options.logApi) display = wrapApi("send", display);

  log("openDataSource");
  const path = dataSource.path;
  display.showMessage(`Loading ${path}`, "Loading...");
  log(`openDataSource: ${path}`);

  let tuple: Tuple;
  switch (dataSource.type) {
    case "loadedAssemblies":
      tuple = openAppWindow(await createSqlLoadedFromDotNet(dataSource));
      break;

    case "coreJson":
      tuple = openAppWindow(await createSqlLoadedFromCoreJson(dataSource));
      break;

    case "customJson":
      tuple = openCustomWindow(await createSqlCustomFromJson(dataSource));
      break;
  }

  const [mainApi, menuViewType, show] = tuple;

  const showViewTypesMenu = (): void => {
    const viewMenu: ViewMenu = {
      menuItems: menuViewType.viewMenuItems(),
      currentViewType: menuViewType.currentViewType(),
      showViewType: menuViewType.changeViewType,
    };
    setViewMenu(viewMenu);
  };

  showViewTypesMenu();

  // log the API
  const result: MainApiAsync = options.logApi ? wrapApi("on", mainApi) : mainApi;

  // hook onAppOptions to refresh the ViewType meny
  const onAppOptions = (appOptions: AppOptions): void => {
    logJson("Hooked onAppOptions", appOptions);
    showViewTypesMenu();
  };
  hookMethod(result, "onAppOptions", onAppOptions);

  // display
  menuViewType.showTitle();
  await show.showViewType();
  await show.showAppOptions(appConfig.appOptions);

  // remember as most-recently-opened iff it opens successfully
  appConfig.dataSource = dataSource;

  return result;
};
