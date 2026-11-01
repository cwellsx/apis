import { AppConfig, AppEvent } from "backend-app";
import { AnyEvent } from "backend-ui";
import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../shared";
import { appWindows } from "./appWindows";
import { showAppViews, showException } from "./show";
import type { WindowContext } from "./types";

// this supports AppEvent as well as AnyEvent because it's also called from onMenuEvent
const onEvents = async (events: AppEvent[], windowContext: WindowContext): Promise<void> => {
  const { presenterApi } = windowContext;

  const appViews = await presenterApi(events);

  // if renderer edits appOptions the event is round-tripped through the app
  const appOptionsEvent = events.find((event) => event.type == "appOptions");
  if (appOptionsEvent) {
    appViews.push({ type: "appOptions", payload: appOptionsEvent.payload });
  }

  showAppViews(windowContext, appViews);
};

export const onMenuEvent = async (menuItemId: string, windowContext: WindowContext): Promise<void> => {
  try {
    await onEvents([{ type: "menuItem", payload: { menuItemId } }], windowContext);
  } catch (e) {
    showException(windowContext.browserWindow, e);
  }
};

export const bindIpcMain = (appConfig: AppConfig): void => {
  // this has a signature which can be passed as the listener parameter to ipcMain.on
  // Electron expects the listener parameter to return void and does not handle the promise
  const onElectronEvents = async (event: Electron.IpcMainEvent, events: AnyEvent[]): Promise<void> => {
    const windowContext = appWindows.find(event);
    if (!windowContext) return;

    try {
      // appOptions is app-specific and is not handled by the backend
      // if it's edited in the renderer then here write the new options to SQL
      const appOptionsEvent = events.find((event) => event.type == "appOptions");
      if (appOptionsEvent) {
        appConfig.appOptions = appOptionsEvent.payload;
        appOptionsEvent.payload = appConfig.appOptions;
      }

      await onEvents(events, windowContext);
    } catch (e) {
      showException(windowContext.browserWindow, e);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  ipcMain.on(IPC_CHANNELS.onEvents, onElectronEvents);
};
