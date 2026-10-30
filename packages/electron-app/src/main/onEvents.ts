import { AnyEvent } from "backend-ui";
import { AppWindow, appWindows } from "./createBrowserWindow";
import { show, showException } from "./show";

export const onEvents = async (events: AnyEvent[], appWindow: AppWindow) => {
  const { presenterApi, browserWindow } = appWindow;
  try {
    const views = await presenterApi(events);
    show(browserWindow, views);
  } catch (e) {
    showException(browserWindow, e);
  }
};

// this has a signature which can be passed as the listener parameter to ipcMain.on
// Electron expects the listener parameter to return void and does not handle the promise
export const onElectronEvents = async (event: Electron.IpcMainEvent, events: AnyEvent[]): Promise<void> => {
  const appWindow = appWindows.find(event);
  if (!appWindow) return;
  await onEvents(events, appWindow);
};
