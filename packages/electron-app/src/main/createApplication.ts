import { hello, log, setPaths } from "backend-api";
import type { MainApiAsync } from "backend-app";
import type { AppOptions, DetailEvent, FilterEvent, GraphEvent, ViewOptions } from "backend-ui";
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

export const createApplication = async (mainWindow: BrowserWindow, appDataPath: string): Promise<void> => {
  setPaths({ appDataPath, coreExePath: CORE_EXE });

  log(`CORE_EXE is ${CORE_EXE}`);
  log(`cwd is ${process.cwd()}`);
  log(`script path is ${__dirname}`);
  const helloMessage = hello();
  log(helloMessage);
  log(`electron version is ${process.versions.electron}`);

  registerFileProtocol();

  const on = (event: IpcMainEvent): MainApiAsync | undefined => appWindows.find(event);

  type Invoke<T> = (api: MainApiAsync, arg: T) => Promise<void>;

  const invoke = <T extends object>(event: Electron.IpcMainEvent, handler: Invoke<T>, argument: T): void => {
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
    invoke(event, (api, arg) => api.onViewOptions(arg), viewOptions);
  });
  ipcMain.on("onAppOptions", (event, appOptions: AppOptions) => {
    invoke(event, (api, arg) => api.onAppOptions(arg), appOptions);
  });
  ipcMain.on("onGraphClick", (event, graphEvent: GraphEvent) => {
    invoke(event, (api, arg) => api.onGraphEvent(arg), graphEvent);
  });
  ipcMain.on("onGraphFilter", (event, filterEvent: FilterEvent) => {
    invoke(event, (api, arg) => api.onFilterEvent(arg), filterEvent);
  });
  ipcMain.on("onDetailClick", (event, detailEvent: DetailEvent) => {
    invoke(event, (api, arg) => api.onDetailEvent(arg), detailEvent);
  });

  await loadURL(mainWindow);
  log("onRendererLoaded");
  await createAppOpened(mainWindow);
};
