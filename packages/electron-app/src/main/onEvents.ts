import { AppEvent } from "backend-app";
import { AnyEvent } from "backend-ui";
import { appWindows } from "./createBrowserWindow";
import { showAppViews, showException } from "./show";
import type { AppWindow } from "./types";

// this supports AppEvent as well as AnyEvent
export const onEvents = async (events: AppEvent[], appWindow: AppWindow): Promise<void> => {
  const { presenterApi, browserWindow, setMenuItems } = appWindow;
  try {
    const appViews = await presenterApi(events);
    showAppViews(appWindow, appViews);
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
