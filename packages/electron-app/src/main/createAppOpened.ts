import { createSqlConfig, existsSync, openDataSource, pathJoin, ShowLoadingMessage } from "backend-api";
import type { DataSource } from "backend-app";
import { dialog, FileFilter, type BrowserWindow } from "electron";
import { appWindows } from "./createBrowserWindow";
import { createAppMenu } from "./menu";
import { onEvents } from "./onEvents";
import { show, showErrorMessage, showException, showMessage } from "./show";

declare const CORE_EXE: string;

export const createAppOpened = async (mainBrowserWindow: BrowserWindow): Promise<void> => {
  // instantiate the Config SQL
  const appConfig = createSqlConfig("config.db");

  const reopenDataSource = async (dataSource: DataSource): Promise<void> => {
    appWindows.closeAll(mainBrowserWindow);
    try {
      const showLoadingMessage: ShowLoadingMessage = (title: string | undefined, message: string) =>
        showMessage(mainBrowserWindow, title, message);

      const presenterApi = await openDataSource(dataSource, setMenuItems, showLoadingMessage);

      // associate the API with the browser so that events are routed to this window
      appWindows.add(presenterApi, mainBrowserWindow);
      // remember as most-recently-opened after it opens successfully
      appConfig.dataSource = dataSource;
      // show appOptions
      show(mainBrowserWindow, [{ type: "appOptions", payload: appConfig.appOptions }]);
      // kick the presenterApi
      await onEvents([], { presenterApi, browserWindow: mainBrowserWindow });
    } catch (error) {
      showException(mainBrowserWindow, error);
    }
  };

  /*
    functions called directly from the various menu items
  */

  const openAssemblies = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainBrowserWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies" };
    await reopenDataSource(dataSource);
  };

  const openJsonPath = (filters: FileFilter[], defaultPath?: string): string | undefined => {
    const paths = dialog.showOpenDialogSync(mainBrowserWindow, { properties: ["openFile"], filters, defaultPath });
    if (!paths) return;
    return paths[0];
  };

  const openCoreJson = async (): Promise<void> => {
    const path = openJsonPath([{ name: "Core", extensions: ["json"] }], pathJoin(CORE_EXE, "Core.json"));
    if (!path) return;
    const dataSource: DataSource = { path, type: "coreJson" };
    await reopenDataSource(dataSource);
  };

  const openCustomJson = async (): Promise<void> => {
    const path = openJsonPath([{ name: "*", extensions: ["json"] }]);
    if (!path) return;
    const dataSource: DataSource = { path, type: "customJson" };
    await reopenDataSource(dataSource);
  };

  const openRecent = async (path: string): Promise<void> => {
    const type = appConfig.recent().find((it) => it.path === path)?.type;
    if (!type) throw new Error("Unknown recent path");
    const dataSource: DataSource = { path, type };
    await reopenDataSource(dataSource);
  };

  const getRecent = (): string[] => {
    const recent = appConfig.recent();
    recent.sort((x, y) => -(x.when - y.when)); // reverse chronological
    return recent.map((it) => it.path);
  };

  const setMenuItems = createAppMenu(
    mainBrowserWindow,
    openAssemblies,
    openCustomJson,
    openCoreJson,
    openRecent,
    getRecent
  );

  if (appConfig.dataSource) {
    if (existsSync(appConfig.dataSource.path)) {
      await reopenDataSource(appConfig.dataSource);
    } else {
      showErrorMessage(mainBrowserWindow, "Not found", "Use the File menu, to open a data source.");
    }
  } else {
    showErrorMessage(mainBrowserWindow, "No data", "Use the File menu, to open a data source.");
  }
};
