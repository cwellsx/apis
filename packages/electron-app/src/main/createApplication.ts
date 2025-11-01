import { DotNetApi, MainApiAsync, createDotNetApi, hello } from "backend-api";
import type { AppOptions, DetailEvent, FilterEvent, GraphEvent, ViewOptions } from "backend-types";
import { log, logApi } from "backend-utils";
import { BrowserWindow, IpcMainEvent, ipcMain } from "electron";
import { registerFileProtocol } from "./convertPathToUrl";
import { createAppOpened } from "./createAppOpened";
import { appWindows, loadURL } from "./createBrowserWindow";

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

  type Invoke<T> = (api: MainApiAsync, arg: T) => Promise<void>;

  const invoke = <T extends object>(
    channel: string,
    event: Electron.IpcMainEvent,
    handler: Invoke<T>,
    argument: T
  ): void => {
    logApi("on", channel, argument);
    const api = on(event);
    if (!api) return;
    try {
      const result = handler(api, argument);
      result.catch((error) => api.showException(error));
    } catch (error) {
      api.showException(error);
    }
  };

  // the following event handlers are a bit verbose and repetitive,
  // but it's clearer to see each one explicitly than to abstract them
  ipcMain.on("onViewOptions", (event, viewOptions: ViewOptions) => {
    invoke("onViewOptions", event, (api, arg) => api.onViewOptions(arg), viewOptions);
  });
  ipcMain.on("onAppOptions", (event, appOptions: AppOptions) => {
    invoke("onAppOptions", event, (api, arg) => api.onAppOptions(arg), appOptions);
  });
  ipcMain.on("onGraphClick", (event, graphEvent: GraphEvent) => {
    invoke("onGraphClick", event, (api, arg) => api.onGraphEvent(arg), graphEvent);
  });
  ipcMain.on("onGraphFilter", (event, filterEvent: FilterEvent) => {
    invoke("onGraphFilter", event, (api, arg) => api.onFilterEvent(arg), filterEvent);
  });
  ipcMain.on("onDetailClick", (event, detailEvent: DetailEvent) => {
    invoke("onDetailClick", event, (api, arg) => api.onDetailEvent(arg), detailEvent);
  });

  await loadURL(mainWindow);
  log("onRendererLoaded");
  await createAppOpened(mainWindow, dotNetApi);
};
