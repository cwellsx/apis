import { DotNetApi, createDotNetApi } from "backend/createDotNetApi";
import { hello } from "backend/hello";
import { BrowserWindow, IpcMainEvent, ipcMain } from "electron";
import type { AppOptions, DetailEvent, FilterEvent, GraphEvent, MainApiAsync, ViewOptions } from "../shared-types";
import { registerFileProtocol } from "./convertPathToUrl";
import { createAppOpened } from "./createAppOpened";
import { appWindows, loadURL } from "./createBrowserWindow";
import { log, logApi } from "./log";
/*
  Assume that complicated functions can be defined but not run, before this function is called.
  So other modules export data and function definitions, but don't invoke functions when they're imported.

  The fact that open needs a lot of parameters suggests it isn't natural to split it from this module --
  but doing so keeps the source files shorter, so more readable.
*/

declare const CORE_EXE: string;

export const createApplication = async (mainWindow: BrowserWindow): Promise<void> => {
  log(`CORE_EXE is ${CORE_EXE}`);
  log(`cwd is ${process.cwd()}`);
  log(`script path is ${__dirname}`);
  const helloMessage = hello();
  log(helloMessage);
  log(`electron version is ${process.versions.electron}`);

  registerFileProtocol();

  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  const on = (event: IpcMainEvent): MainApiAsync | undefined => appWindows.find(event);

  // the following event handlers are a bit verbose and repetitive,
  // but it's clearer to see each one explicitly than to abstract them
  ipcMain.on("onViewOptions", (event, viewOptions: ViewOptions) => {
    logApi("on", "onViewOptions", viewOptions);
    const api = on(event);
    if (!api) return;
    try {
      api.onViewOptions(viewOptions).catch((error) => api.showException(error));
    } catch (error) {
      api.showException(error);
    }
  });
  ipcMain.on("onAppOptions", (event, appOptions: AppOptions) => {
    logApi("on", "onAppOptions", appOptions);
    const api = on(event);
    if (!api) return;
    try {
      api.onAppOptions(appOptions);
    } catch (error) {
      api.showException(error);
    }
  });
  ipcMain.on("onGraphClick", (event, graphEvent: GraphEvent) => {
    logApi("on", "onGraphClick", graphEvent);
    const api = on(event);
    if (!api) return;
    try {
      api.onGraphEvent(graphEvent).catch((error) => api.showException(error));
    } catch (error) {
      api.showException(error);
    }
  });
  ipcMain.on("onGraphFilter", (event, filterEvent: FilterEvent) => {
    logApi("on", "onGraphFilter", filterEvent);
    const api = on(event);
    if (!api) return;
    try {
      api.onFilterEvent(filterEvent).catch((error) => api.showException(error));
    } catch (error) {
      api.showException(error);
    }
  });
  ipcMain.on("onDetailClick", (event, detailEvent: DetailEvent) => {
    logApi("on", "onDetailClick", detailEvent);
    const api = on(event);
    if (!api) return;
    try {
      api.onDetailEvent(detailEvent).catch((error) => api.showException(error));
    } catch (error) {
      api.showException(error);
    }
  });

  await loadURL(mainWindow);
  log("onRendererLoaded");
  await createAppOpened(mainWindow, dotNetApi);
};
