import { getErrorString } from "backend/error";
import { log, logApi } from "backend/log";
import type { AppOptions, DisplayApi, View, ViewDetails, ViewGreeting } from "backend/shared-types";
import type { BrowserWindow } from "electron";

export const createDisplay = (mainWindow: BrowserWindow): DisplayApi => {
  const webContents = mainWindow.webContents;

  const showGreeting = (greeting: string): void => {
    const view: ViewGreeting = { greeting, viewType: "greeting" };
    log(`showGreeting(${greeting})`);
    webContents.send("showView", view);
  };

  const showException = (error: unknown): void => {
    mainWindow.setTitle("Error");
    const message = getErrorString(error);
    showGreeting(message);
  };

  const showMessage = (title: string | undefined, message: string): void => {
    if (title) mainWindow.setTitle(title);
    showGreeting(message);
  };

  const setTitle = (title: string): void => {
    mainWindow.setTitle(title);
  };

  const showView = (view: View): void => {
    logApi("send", "showView", view);
    webContents.send("showView", view);
  };

  const showDetails = (details: ViewDetails): void => {
    logApi("send", "showDetails", details);
    webContents.send("showDetails", details);
  };

  const showAppOptions = (appOptions: AppOptions): void => {
    logApi("send", "showAppOptions", appOptions);
    webContents.send("showAppOptions", appOptions);
  };

  return { showView, showDetails, setTitle, showAppOptions, showException, showMessage };
};
