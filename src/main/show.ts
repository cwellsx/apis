import type { BrowserWindow } from "electron";
import type { AppOptions, RendererApi, View, ViewDetails, ViewGreeting } from "../shared-types";
import { getErrorString } from "./error";

export type Show = {
  showException: (error: unknown) => void;
  showMessage: (title: string, message: string) => void;
};

export const show = (mainWindow: BrowserWindow): Show => {
  const webContents = mainWindow.webContents;

  const showGreeting = (greeting: string): void => {
    const view: ViewGreeting = {
      greeting,
      viewOptions: { viewType: "greeting" },
    };
    webContents.send("showView", view);
  };
  const showException = (error: unknown): void => {
    mainWindow.setTitle("Error");
    const message = getErrorString(error);
    showGreeting(message);
  };
  const showMessage = (title: string, message: string): void => {
    mainWindow.setTitle(title);
    showGreeting(message);
  };

  return { showException, showMessage };
};

export const renderer = (mainWindow: BrowserWindow): RendererApi => {
  const webContents = mainWindow.webContents;

  const showView = (view: View): void => webContents.send("showView", view);
  const showDetails = (details: ViewDetails): void => webContents.send("showDetails", details);
  const showAppOptions = (appOptions: AppOptions): void => webContents.send("showAppOptions", appOptions);

  return { showView, showDetails, showAppOptions };
};
