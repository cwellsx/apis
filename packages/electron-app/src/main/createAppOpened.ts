import { FileFilter, dialog, type BrowserWindow } from "electron";
import { createAppWindow } from "./createAppWindow";
import { appWindows } from "./createBrowserWindow";
import { createCustomWindow } from "./createCustomWindow";
import { DotNetApi } from "./createDotNetApi";
import type { CustomNode } from "./customJson";
import { fixCustomJson, isCustomJson } from "./customJson";
import { existsSync, getAppFilename, pathJoin, readJsonT, whenFile, writeFileSync } from "./fs";
import { hash } from "./hash";
import type { Reflected } from "./loaded";
import { isReflected } from "./loaded";
import { log } from "./log";
import { createAppMenu } from "./menu";
import { options } from "./shared-types";
import { show } from "./show";
import { SqlCustom, SqlLoaded, createSqlConfig, createSqlCustom, createSqlLoaded, type DataSource } from "./sql";

declare const CORE_EXE: string;

export const createAppOpened = async (mainWindow: BrowserWindow, dotNetApi: DotNetApi): Promise<void> => {
  // instantiate the Config SQL
  const sqlConfig = createSqlConfig("config.db");

  // not yet the DataSource SQL
  let sqlLoaded: SqlLoaded | undefined;
  let sqlCustom: SqlCustom | undefined;

  const closeAll = (): void => {
    if (sqlLoaded) {
      sqlLoaded.close();
      sqlLoaded = undefined;
    }
    if (sqlCustom) {
      sqlCustom.close();
      sqlCustom = undefined;
    }
    appWindows.closeAll(mainWindow);
  };

  const changeSqlLoaded = (dataSource: DataSource): SqlLoaded => {
    log("changeSqlLoaded");
    closeAll();
    return createSqlLoaded(dataSource);
  };

  const changeSqlCustom = (dataSource: DataSource): SqlCustom => {
    log("changeSqlCustom");
    closeAll();
    return createSqlCustom(dataSource);
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
      if (options.alwaysReload || sqlLoaded.shouldReload(when)) {
        log("getLoaded");
        const reflected = await getReflected(dataSource.path);
        // save Reflected
        const jsonPath = getAppFilename(`Reflected.${dataSource.hash}.json`);
        log(`writeFileSync(${jsonPath})`);
        writeFileSync(jsonPath, JSON.stringify(reflected, null, " "));
        sqlLoaded.save(reflected, when, dataSource.hash);
      } else log("!getLoaded");
      const appWindow = createAppWindow(mainWindow, sqlLoaded, sqlConfig, dataSource.path, setViewMenu);
      appWindow.openViewType();
    };

    const openSqlCustom = async (when: string, getCustom: (path: string) => Promise<CustomNode[]>): Promise<void> => {
      sqlCustom = changeSqlCustom(dataSource);
      if (options.alwaysReload || sqlCustom.shouldReload(when)) {
        const nodes = await getCustom(dataSource.path);
        const errors = fixCustomJson(nodes);
        sqlCustom.save(nodes, errors, when);
      }
      const customWindow = createCustomWindow(mainWindow, sqlCustom, sqlConfig, dataSource.path, setViewMenu);
      customWindow.openViewType();
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
          break;
      }
      // remember as most-recently-opened iff it opens successfully
      sqlConfig.dataSource = dataSource;
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
    const paths = dialog.showOpenDialogSync(mainWindow, {
      properties: ["openFile"],
      filters,
      defaultPath,
    });
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
      await openDataSource(sqlConfig.dataSource);
    } else {
      show(mainWindow).showMessage("Not found", "Use the File menu, to open a data source.");
    }
  } else {
    show(mainWindow).showMessage("No data", "Use the File menu, to open a data source.");
  }
};
