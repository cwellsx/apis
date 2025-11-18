import { createSqlConfig, existsSync, openDataSource, pathJoin } from "backend-api";
import type { DataSource } from "backend-app";
import { FileFilter, dialog, type BrowserWindow } from "electron";
import { appWindows } from "./createBrowserWindow";
import { createAppMenu } from "./menu";
import { createDisplay } from "./show";

declare const CORE_EXE: string;

export const createAppOpened = async (mainWindow: BrowserWindow): Promise<void> => {
  // instantiate the Config SQL
  const appConfig = createSqlConfig("config.db");

  const display = createDisplay(mainWindow);

  const reopenDataSource = async (dataSource: DataSource): Promise<void> => {
    appWindows.closeAll(mainWindow);
    try {
      const mainApi = await openDataSource(dataSource, display, setViewMenu, appConfig);
      if (mainApi) appWindows.add(mainApi, mainWindow);
    } catch (error) {
      display.showException(error);
    }
  };

  /*
    functions called directly from the various menu items
  */

  const openAssemblies = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies" };
    await reopenDataSource(dataSource);
  };

  const openJsonPath = (filters: FileFilter[], defaultPath?: string): string | undefined => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openFile"], filters, defaultPath });
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

  const { setViewMenu } = createAppMenu(
    mainWindow,
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
      display.showMessage("Not found", "Use the File menu, to open a data source.");
    }
  } else {
    display.showMessage("No data", "Use the File menu, to open a data source.");
  }
};
