import { BrowserWindow, IpcMainEvent, ipcMain } from "electron";
import { hello } from "shared";
import type { MainApi } from "../shared-types";
import { registerFileProtocol } from "./convertPathToUrl";
import { createAppOpened } from "./createAppOpened";
import { appWindows } from "./createBrowserWindow";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { log, logApi } from "./log";
/*
  Assume that complicated functions can be defined but not run, before this function is called.
  So other modules export data and function definitions, but don't invoke functions when they're imported.

  The fact that open needs a lot of parameters suggests it isn't natural to split it from this module --
  but doing so keeps the source files shorter, so more readable.
*/

declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);
log(`cwd is ${process.cwd()}`);
log(`script path is ${__dirname}`);
const helloMessage = hello();
log(helloMessage);
log(`electron version is ${process.versions.electron}`);

export function createApplication(mainWindow: BrowserWindow): void {
  registerFileProtocol();

  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  const on = (event: IpcMainEvent): MainApi | undefined => appWindows.find(event)?.mainApi;

  ipcMain.on("onViewOptions", (event, viewOptions) => {
    logApi("on", "onViewOptions", viewOptions);
    on(event)?.onViewOptions(viewOptions);
  });
  ipcMain.on("onAppOptions", (event, appOptions) => {
    logApi("on", "onAppOptions", appOptions);
    on(event)?.onAppOptions(appOptions);
  });
  ipcMain.on("onGraphClick", (event, graphEvent) => {
    logApi("on", "onGraphClick", graphEvent);
    on(event)?.onGraphEvent(graphEvent);
  });
  ipcMain.on("onGraphFilter", (event, filterEvent) => {
    logApi("on", "onGraphFilter", filterEvent);
    on(event)?.onFilterEvent(filterEvent);
  });
  ipcMain.on("onDetailClick", (event, nodeId) => {
    logApi("on", "onDetailClick", nodeId);
    on(event)?.onDetailEvent(nodeId);
  });

  // these mutate sqlLoaded so they're declared inline
  // perhaps these and sqlLoaded could be migrated together to another module

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    await createAppOpened(mainWindow, dotNetApi);
  }

  mainWindow.webContents.once("did-finish-load", onRendererLoaded);
}
