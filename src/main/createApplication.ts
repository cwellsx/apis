import { BrowserWindow, IpcMainEvent, ipcMain } from "electron";
import type { MainApi } from "../shared-types";
import { registerFileProtocol } from "./convertPathToUrl";
import { createAppOpened } from "./createAppOpened";
import { appWindows } from "./createBrowserWindow";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { log } from "./log";

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

  const on = (event: IpcMainEvent): MainApi | undefined => appWindows.find(event)?.mainApi;

  ipcMain.on("onViewOptions", (event, viewOptions) => on(event)?.onViewOptions(viewOptions));
  ipcMain.on("onAppOptions", (event, appOptions) => on(event)?.onAppOptions(appOptions));
  ipcMain.on("onGraphClick", (event, graphEvent) => on(event)?.onGraphClick(graphEvent));
  ipcMain.on("onDetailClick", (event, nodeId) => on(event)?.onDetailClick(nodeId));

  // these mutate sqlLoaded so they're declared inline
  // perhaps these and sqlLoaded could be migrated together to another module

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    await createAppOpened(mainWindow, dotNetApi);
  }

  mainWindow.webContents.once("did-finish-load", onRendererLoaded);
}
