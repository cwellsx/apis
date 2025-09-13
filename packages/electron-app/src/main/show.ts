import type { BrowserWindow } from "electron";
import type { AppOptions, RendererApi, View, ViewDetails, ViewGreeting } from "../shared-types";
import { getErrorString } from "./error";
import { log, logApi } from "./log";

export type Show = {
  showException: (error: unknown) => void;
  showMessage: (title: string | undefined, message: string) => void;
};

export const show = (mainWindow: BrowserWindow): Show => {
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

  return { showException, showMessage };
};

export const renderer = (mainWindow: BrowserWindow): RendererApi => {
  const webContents = mainWindow.webContents;

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

  return { showView, showDetails, showAppOptions };
};
