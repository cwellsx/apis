import { BrowserWindow, ipcMain } from "electron";
import type { MainApi, MouseEvent } from "../shared-types";
import { registerFileProtocol } from "./convertPathToUrl";
import { convertToTypes } from "./convertToTypes";
import { viewSqlLoaded } from "./convertToView";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { getAppFilename } from "./fs";
import { log } from "./log";
import { open } from "./open";
import type { Loaded } from "./shared-types";
import { IShow, Show } from "./show";
import { DataSource, SqlLoaded, createSqlConfig, createSqlLoaded } from "./sqlTables";

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

  // instantiate the Config SQL
  const sqlConfig = createSqlConfig(getAppFilename("config.db"));
  // not yet the DataSource SQL
  let sqlLoaded: SqlLoaded | undefined;
  const changeSqlLoaded = (dataSource: DataSource): SqlLoaded => {
    log("changeSqlLoaded");
    if (sqlLoaded) sqlLoaded.close();
    sqlLoaded = createSqlLoaded(getAppFilename(`${dataSource.type}-${dataSource.hash}`));
    return sqlLoaded;
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

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    await open(mainWindow, dotNetApi, changeSqlLoaded, sqlConfig, show);
  }

  mainWindow.webContents.once("did-finish-load", onRendererLoaded);
}
