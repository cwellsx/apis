import { BrowserWindow, IpcMainEvent, ipcMain } from "electron";
import type { MainApi } from "../shared-types";
import { registerFileProtocol } from "./convertPathToUrl";
import { appWindows, createAppWindow } from "./createAppWindow";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { getAppFilename, writeFileSync } from "./fs";
import type { Reflected } from "./loaded";
import { loadedVersion } from "./loaded";
import { log } from "./log";
import { open } from "./open";
import { readCoreJson, whenCoreJson } from "./readCoreJson";
import { options } from "./shared-types";
import { show } from "./show";
import { showErrorBox } from "./showErrorBox";
import { DataSource, SqlLoaded, createSqlConfig, createSqlLoaded } from "./sqlTables";

/*
  Assume that complicated functions can be defined but not run, before this function is called.
  So other modules export data and function definitions, but don't invoke functions when they're imported.

  The fact that open needs a lot of parameters suggests it isn't natural to split it from this module --
  but doing so keeps the source files shorter, so more readable.
*/

declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);

export function createApplication(mainWindow: BrowserWindow): void {
  registerFileProtocol();

  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  // instantiate the Config SQL
  const sqlConfig = createSqlConfig(getAppFilename("config.db"));

  // not yet the DataSource SQL
  let sqlLoaded: SqlLoaded | undefined;

  const changeSqlLoaded = (dataSource: DataSource): SqlLoaded => {
    log("changeSqlLoaded");
    if (sqlLoaded) {
      sqlLoaded.close();
      appWindows.closeAll(mainWindow);
    }
    return createSqlLoaded(getAppFilename(`${dataSource.type}-${dataSource.hash}`));
  };

  const on = (event: IpcMainEvent): MainApi | undefined => appWindows.find(event)?.mainApi;

  ipcMain.on("onViewOptions", (event, viewOptions) => on(event)?.onViewOptions(viewOptions));
  ipcMain.on("onAppOptions", (event, appOptions) => on(event)?.onAppOptions(appOptions));
  ipcMain.on("onGraphClick", (event, graphEvent) => on(event)?.onGraphClick(graphEvent));
  ipcMain.on("onDetailClick", (event, assemblyId, id) => on(event)?.onDetailClick(assemblyId, id));

  // these mutate sqlLoaded so they're declared inline
  // perhaps these and sqlLoaded could be migrated together to another module

  const openSqlLoaded = async (
    dataSource: DataSource,
    when: string,
    getReflected: (path: string) => Promise<Reflected>
  ): Promise<void> => {
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
    appWindow.showReferences();
  };

  const readDotNetApi = async (path: string): Promise<Reflected> => {
    const json = await dotNetApi.getJson(path);
    const reflected = JSON.parse(json);
    return reflected;
  };

  // the caller wraps this with a try/catch handler
  const onOpen = async (dataSource: DataSource): Promise<void> => {
    log("openDataSource");
    const path = dataSource.path;
    show(mainWindow).showMessage(`Loading ${path}`, "Loading...");
    switch (dataSource.type) {
      case "loadedAssemblies":
        await openSqlLoaded(dataSource, await dotNetApi.getWhen(dataSource.path), readDotNetApi);
        break;
      case "coreJson":
        await openSqlLoaded(dataSource, await whenCoreJson(dataSource.path), readCoreJson);
        break;
      case "customJson":
        showErrorBox("Not implemented", "This option isn't implemented yet");
        return;
    }
  };

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    await open(mainWindow, onOpen, sqlConfig);
  }

  mainWindow.webContents.once("did-finish-load", onRendererLoaded);
}
