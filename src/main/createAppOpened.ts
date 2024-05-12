import { FileFilter, dialog, type BrowserWindow } from "electron";
import { ViewType } from "../shared-types";
import { createAppWindow } from "./createAppWindow";
import { appWindows } from "./createBrowserWindow";
import { createCustomWindow } from "./createCustomWindow";
import { DotNetApi } from "./createDotNetApi";
import { getAppFilename, pathJoin, readJsonT, whenFile, writeFileSync } from "./fs";
import { hash } from "./hash";
import { fixCustomJson, isCustomJson, type CustomNode } from "./isCustomJson";
import { isReflected } from "./isReflected";
import { Reflected, loadedVersion } from "./loaded";
import { log } from "./log";
import { ViewMenu, ViewMenuItem, createMenu } from "./menu";
import { options } from "./shared-types";
import { show } from "./show";
import { SqlCustom, SqlLoaded, createSqlConfig, createSqlCustom, createSqlLoaded, type DataSource } from "./sqlTables";

declare const CORE_EXE: string;

export const createAppOpened = async (mainWindow: BrowserWindow, dotNetApi: DotNetApi): Promise<void> => {
  // instantiate the Config SQL
  const sqlConfig = createSqlConfig(getAppFilename("config.db"));

  // not yet the DataSource SQL
  let sqlLoaded: SqlLoaded | undefined;
  let sqlCustom: SqlCustom | undefined;

  // not yet the ViewMenu
  let viewMenu: ViewMenu | undefined;

  const changeSqlLoaded = (dataSource: DataSource): SqlLoaded => {
    log("changeSqlLoaded");
    if (sqlLoaded) sqlLoaded.close();
    if (sqlCustom) sqlCustom.close();
    appWindows.closeAll(mainWindow);
    return createSqlLoaded(getAppFilename(`${dataSource.type}-${dataSource.hash}`));
  };

  const changeSqlCustom = (dataSource: DataSource): SqlCustom => {
    log("changeSqlCustom");
    if (sqlLoaded) sqlLoaded.close();
    if (sqlCustom) sqlCustom.close();
    appWindows.closeAll(mainWindow);
    return createSqlCustom(getAppFilename(`${dataSource.type}-${dataSource.hash}`));
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
      const menuItems: ViewMenuItem[] = [
        { label: "Assembly references", viewType: "references" },
        { label: "APIs", viewType: "apis" },
      ];
      if (sqlLoaded.readErrors().length !== 0) menuItems.push({ label: ".NET reflection errors", viewType: "errors" });
      viewMenu = {
        menuItems,
        getViewType: () => sqlLoaded?.viewState.viewType,
        showViewType: (viewType?: ViewType): void => {
          appWindow.showViewType(viewType);
          setApplicationMenu();
        },
      };
    };

    const openSqlCustom = async (when: string, getCustom: (path: string) => Promise<CustomNode[]>): Promise<void> => {
      sqlCustom = changeSqlCustom(dataSource);
      if (
        options.alwaysReload ||
        !sqlCustom.viewState.cachedWhen ||
        Date.parse(sqlCustom.viewState.cachedWhen) < Date.parse(when)
      ) {
        const nodes = await getCustom(dataSource.path);
        const errors = fixCustomJson(nodes);
        sqlCustom.save(nodes, errors, when);
      }
      const customWindow = createCustomWindow(mainWindow, sqlCustom, sqlConfig, dataSource.path);
      customWindow.showViewType();

      const menuItems: ViewMenuItem[] = [{ label: "Custom JSON", viewType: "custom" }];
      if (sqlCustom.readErrors().length !== 0)
        menuItems.push({ label: "Custom JSON syntax errors", viewType: "errors" });
      viewMenu = {
        menuItems,
        getViewType: () => sqlCustom?.viewState.viewType,
        showViewType: (viewType?: ViewType): void => {
          customWindow.showViewType(viewType);
          setApplicationMenu();
        },
      };
    };

    const readDotNetApi = async (path: string): Promise<Reflected> => {
      const json = await dotNetApi.getJson(path);
      const reflected = JSON.parse(json);
      return reflected;
    };

    const readCoreJson = async (path: string): Promise<Reflected> => await readJsonT(path, isReflected);

    const readCustomJson = async (path: string): Promise<CustomNode[]> => await readJsonT(path, isCustomJson);

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
          await openSqlLoaded(await whenFile(dataSource.path), readCoreJson);
          break;
        case "customJson":
          await openSqlCustom(await whenFile(dataSource.path), readCustomJson);
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

  const openJsonPath = async (filters: FileFilter[], defaultPath?: string): Promise<string | undefined> => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openFile"], filters, defaultPath });
    if (!paths) return;
    return paths[0];
  };

  const openCoreJson = async (): Promise<void> => {
    const path = await openJsonPath([{ name: "Core", extensions: ["json"] }], pathJoin(CORE_EXE, "Core.json"));
    if (!path) return;
    const dataSource: DataSource = { path, type: "coreJson", hash: hash(path) };
    await openDataSource(dataSource);
  };

  const openCustomJson = async (): Promise<void> => {
    const path = await openJsonPath([{ name: "*", extensions: ["json"] }]);
    if (!path) return;
    const dataSource: DataSource = { path, type: "customJson", hash: hash(path) };
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
