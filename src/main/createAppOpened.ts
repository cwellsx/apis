import { dialog, type BrowserWindow } from "electron";
import { appWindows, createAppWindow } from "./createAppWindow";
import { DotNetApi } from "./createDotNetApi";
import { getAppFilename, pathJoin, writeFileSync } from "./fs";
import { hash } from "./hash";
import { Reflected, loadedVersion } from "./loaded";
import { log } from "./log";
import { ViewMenu, createMenu } from "./menu";
import { readCoreJson, whenCoreJson } from "./readCoreJson";
import { options } from "./shared-types";
import { show } from "./show";
import { showErrorBox } from "./showErrorBox";
import { SqlLoaded, createSqlConfig, createSqlLoaded, type DataSource } from "./sqlTables";

declare const CORE_EXE: string;

export const createAppOpened = async (mainWindow: BrowserWindow, dotNetApi: DotNetApi): Promise<void> => {
  // instantiate the Config SQL
  const sqlConfig = createSqlConfig(getAppFilename("config.db"));

  // not yet the DataSource SQL
  let sqlLoaded: SqlLoaded | undefined;

  // not yet the ViewMenu
  let viewMenu: ViewMenu | undefined;

  const changeSqlLoaded = (dataSource: DataSource): SqlLoaded => {
    log("changeSqlLoaded");
    if (sqlLoaded) {
      sqlLoaded.close();
      appWindows.closeAll(mainWindow);
    }
    return createSqlLoaded(getAppFilename(`${dataSource.type}-${dataSource.hash}`));
  };

  /*
    openDataSource to open any and all types of DataSource
  */

  const openDataSource = async (dataSource: DataSource): Promise<void> => {
    /*
      subroutines
    */
    const openSqlLoaded = async (when: string, getReflected: (path: string) => Promise<Reflected>): Promise<void> => {
      sqlLoaded = changeSqlLoaded(dataSource);
      if (
        options.alwaysReload ||
        !sqlLoaded.viewState.cachedWhen ||
        loadedVersion !== sqlLoaded.viewState.loadedVersion ||
        Date.parse(sqlLoaded.viewState.cachedWhen) < Date.parse(when)
      ) {
        log("getLoaded");
        const reflected = await getReflected(dataSource.path);
        // save Reflected
        const jsonPath = getAppFilename(`Reflected.${dataSource.hash}.json`);
        writeFileSync(jsonPath, JSON.stringify(reflected, null, " "));
        sqlLoaded.save(reflected, when, dataSource.hash);
      } else log("!getLoaded");
      const appWindow = createAppWindow(mainWindow, sqlLoaded, sqlConfig, dataSource.path);
      appWindow.showViewType();

      // initialize ViewMenu before the menu is recreated
      const hasErrors = sqlLoaded.readErrors().length !== 0;
      viewMenu = { hasErrors, viewType: sqlLoaded.viewState.viewType, showViewType: appWindow.showViewType };
    };

    const readDotNetApi = async (path: string): Promise<Reflected> => {
      const json = await dotNetApi.getJson(path);
      const reflected = JSON.parse(json);
      return reflected;
    };

    /*
      statements wrapped in a try/catch handler
    */

    try {
      log("openDataSource");
      viewMenu = undefined;
      const path = dataSource.path;
      show(mainWindow).showMessage(`Loading ${path}`, "Loading...");
      switch (dataSource.type) {
        case "loadedAssemblies":
          await openSqlLoaded(await dotNetApi.getWhen(dataSource.path), readDotNetApi);
          break;
        case "coreJson":
          await openSqlLoaded(await whenCoreJson(dataSource.path), readCoreJson);
          break;
        case "customJson":
          showErrorBox("Not implemented", "This option isn't implemented yet");
          return;
      }
      // remember as most-recently-opened iff it opens successfully
      sqlConfig.dataSource = dataSource;
      // update the list of recently opened paths by recreating the menu
      setApplicationMenu();
    } catch (error: unknown | Error) {
      show(mainWindow).showException(error);
    }
  };

  /*
    functions called directly from the various menu items
  */

  const openAssemblies = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies", hash: hash(path) };
    await openDataSource(dataSource);
  };

  const openCustomJson = (): void => {
    showErrorBox("Not implemented", "This option isn't implemented yet");
  };

  const openCoreJson = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Core", extensions: ["json"] }],
      defaultPath: pathJoin(CORE_EXE, "Core.json"),
    });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "coreJson", hash: hash(path) };
    await openDataSource(dataSource);
  };

  const openRecent = async (path: string): Promise<void> => {
    const type = sqlConfig.recent().find((it) => it.path === path)?.type;
    if (!type) throw new Error("Unknown recent path");
    const dataSource: DataSource = { path, type, hash: hash(path) };
    await openDataSource(dataSource);
  };

  const setApplicationMenu = (): void => {
    const recent = sqlConfig.recent();
    recent.sort((x, y) => -(x.when - y.when)); // reverse chronological
    createMenu(
      openAssemblies,
      openCustomJson,
      openCoreJson,
      recent.map((it) => it.path),
      openRecent,
      viewMenu
    );
  };

  setApplicationMenu();

  if (sqlConfig.dataSource) {
    await openDataSource(sqlConfig.dataSource);
  } else {
    show(mainWindow).showMessage("No data", "Use the File menu, to open a data source.");
  }
};
