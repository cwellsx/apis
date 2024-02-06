import { BrowserWindow, ipcMain } from "electron";
import type { MainApi, MouseEvent } from "../shared-types";
import { registerFileProtocol } from "./convertPathToUrl";
import { convertToTypes } from "./convertToTypes";
import { viewSqlLoaded } from "./convertToView";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { getAppFilename, writeFileSync } from "./fs";
import { log } from "./log";
import { open } from "./open";
import { readCoreJson, whenCoreJson } from "./readCoreJson";
import { loadedVersion, type Loaded } from "./shared-types";
import { IShow, Show } from "./show";
import { showErrorBox } from "./showErrorBox";
import { DataSource, SqlLoaded, createSqlLoaded } from "./sqlTables";

/*
  Assume that complicated functions can be defined but not run, before this function is called.
  So other modules export data and function definitions, but don't invoke functions when they're imported.

  These APIs are created when this function is run:
  - mainApi
  - renderApi
  - dotNetApi
  - sqlTables

  So these are local variables of this function, and injected into the function which needs them --
  specifically the open function, whose contents were previously inline this module.

  The fact that open needs a lot of parameters suggests it isn't natural to split it from this module --
  but doing so keeps the source files shorter, so more readable.
*/

declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);

export function createApplication(mainWindow: BrowserWindow): void {
  registerFileProtocol();

  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  // not yet the DataSource SQL
  let sqlLoaded: SqlLoaded | undefined;
  const changeSqlLoaded = (dataSource: DataSource): SqlLoaded => {
    log("changeSqlLoaded");
    if (sqlLoaded) sqlLoaded.close();
    return createSqlLoaded(getAppFilename(`${dataSource.type}-${dataSource.hash}`));
  };

  // implement the MainApi and bind it to ipcMain
  const mainApi: MainApi = {
    setLeafVisible: (names: string[]): void => {
      log("setLeafVisible");
      if (!sqlLoaded) return;
      sqlLoaded.viewState.leafVisible = names;
      const view = viewSqlLoaded(sqlLoaded, false);
      show.view(view);
    },
    setGroupExpanded: (names: string[]): void => {
      log("setGroupExpanded");
      if (!sqlLoaded) return;
      sqlLoaded.viewState.groupExpanded = names;
      const view = viewSqlLoaded(sqlLoaded, false);
      show.view(view);
    },
    onClick: (id: string, event: MouseEvent): void => {
      log("onClick");
      if (!sqlLoaded) return;
      const loaded: Loaded = sqlLoaded.read();
      const types = convertToTypes(loaded, id);
      log("showTypes");
      show.types(types);
    },
  };
  ipcMain.on("setLeafVisible", (event, names) => mainApi.setLeafVisible(names));
  ipcMain.on("setGroupExpanded", (event, names) => mainApi.setGroupExpanded(names));
  ipcMain.on("onClick", (event, id, mouseEvent) => mainApi.onClick(id, mouseEvent));

  // wrap use of the renderer API
  const show: IShow = new Show(mainWindow);

  const openSqlLoaded = async (
    dataSource: DataSource,
    when: string,
    getLoaded: (path: string) => Promise<Loaded>
  ): Promise<void> => {
    sqlLoaded = changeSqlLoaded(dataSource);
    if (
      !sqlLoaded.viewState.cachedWhen ||
      loadedVersion !== sqlLoaded.viewState.loadedVersion ||
      Date.parse(sqlLoaded.viewState.cachedWhen) < Date.parse(when)
    ) {
      log("getLoaded");
      const loaded = await getLoaded(dataSource.path);
      const jsonPath = getAppFilename(`Core.${dataSource.hash}.json`);
      writeFileSync(jsonPath, JSON.stringify(loaded, null, " "));
      sqlLoaded.save(loaded, when);
    } else log("!getLoaded");
    mainWindow.setTitle(dataSource.path);
    const view = viewSqlLoaded(sqlLoaded, true);
    show.view(view);
  };

  const readDotNetApi = async (path: string): Promise<Loaded> => {
    const json = await dotNetApi.getJson(path);
    const loaded = JSON.parse(json);
    return loaded;
  };

  // the caller wraps this with a try/catch handler
  const onOpen = async (dataSource: DataSource): Promise<void> => {
    log("openDataSource");
    const path = dataSource.path;
    show.message(`Loading ${path}`, "Loading...");
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
    await open(mainWindow, show, onOpen);
  }

  mainWindow.webContents.once("did-finish-load", onRendererLoaded);
}
