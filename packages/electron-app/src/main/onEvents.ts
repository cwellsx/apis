import { AppEvent } from "backend-app";
import { AnyEvent } from "backend-ui";
import { appWindows } from "./createBrowserWindow";
import { showAppViews, showException } from "./show";
import type { WindowContext } from "./types";

// this supports AppEvent as well as AnyEvent because it's also called from setMenuItems
export const onEvents = async (events: AppEvent[], windowContext: WindowContext): Promise<void> => {
  const { presenterApi, browserWindow } = windowContext;
  try {
    const appViews = await presenterApi(events);
    showAppViews(windowContext, appViews);
  } catch (e) {
    showException(browserWindow, e);
  }
};

// this has a signature which can be passed as the listener parameter to ipcMain.on
// Electron expects the listener parameter to return void and does not handle the promise
export const onElectronEvents = async (event: Electron.IpcMainEvent, events: AnyEvent[]): Promise<void> => {
  const windowContext = appWindows.find(event);
  if (!windowContext) return;
  await onEvents(events, windowContext);
};
