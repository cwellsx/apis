import { DotNetApi } from "backend/createDotNetApi";
import { existsSync, pathJoin } from "backend/fs";
import { hash } from "backend/hash";
import { openDataSource } from "backend/openDataSource";
import { createSqlConfig, type DataSource } from "backend/sql";
import { FileFilter, dialog, type BrowserWindow } from "electron";
import { appWindows } from "./createBrowserWindow";
import { createAppMenu } from "./menu";
import { createDisplay } from "./show";

declare const CORE_EXE: string;

export const createAppOpened = async (mainWindow: BrowserWindow, dotNetApi: DotNetApi): Promise<void> => {
  // instantiate the Config SQL
  const sqlConfig = createSqlConfig("config.db");

  const display = createDisplay(mainWindow);

  const reopenDataSource = async (dataSource: DataSource): Promise<void> => {
    appWindows.closeAll(mainWindow);
    const mainApi = await openDataSource(dataSource, display, dotNetApi, setViewMenu, sqlConfig);
    if (mainApi) appWindows.add(mainApi, mainWindow);
  };

  /*
    functions called directly from the various menu items
  */

  const openAssemblies = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies", hash: hash(path) };
    await reopenDataSource(dataSource);
  };

  const openJsonPath = (filters: FileFilter[], defaultPath?: string): string | undefined => {
    const paths = dialog.showOpenDialogSync(mainWindow, {
      properties: ["openFile"],
      filters,
      defaultPath,
    });
    if (!paths) return;
    return paths[0];
  };

  const openCoreJson = async (): Promise<void> => {
    const path = openJsonPath([{ name: "Core", extensions: ["json"] }], pathJoin(CORE_EXE, "Core.json"));
    if (!path) return;
    const dataSource: DataSource = { path, type: "coreJson", hash: hash(path) };
    await reopenDataSource(dataSource);
  };

  const openCustomJson = async (): Promise<void> => {
    const path = openJsonPath([{ name: "*", extensions: ["json"] }]);
    if (!path) return;
    const dataSource: DataSource = { path, type: "customJson", hash: hash(path) };
    await reopenDataSource(dataSource);
  };

  const openRecent = async (path: string): Promise<void> => {
    const type = sqlConfig.recent().find((it) => it.path === path)?.type;
    if (!type) throw new Error("Unknown recent path");
    const dataSource: DataSource = { path, type, hash: hash(path) };
    await reopenDataSource(dataSource);
  };

  const getRecent = (): string[] => {
    const recent = sqlConfig.recent();
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

  if (sqlConfig.dataSource) {
    if (existsSync(sqlConfig.dataSource.path)) {
      await reopenDataSource(sqlConfig.dataSource);
    } else {
      display.showMessage("Not found", "Use the File menu, to open a data source.");
    }
  } else {
    display.showMessage("No data", "Use the File menu, to open a data source.");
  }
};
