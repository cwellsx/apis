import type { BrowserWindow } from "electron";
import type { AppOptions, RendererApi, Types, View } from "../shared-types";
import { getErrorString } from "./error";

export type Show = {
  showException: (error: unknown) => void;
  showMessage: (title: string, message: string) => void;
};

export const show = (mainWindow: BrowserWindow): Show => {
  const webContents = mainWindow.webContents;
  const showGreeting = (greeting: string): void => webContents.send("showGreeting", greeting);

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

  const showGreeting = (greeting: string): void => webContents.send("showGreeting", greeting);
  const showView = (view: View): void => webContents.send("showView", view);
  const showTypes = (types: Types): void => webContents.send("showTypes", types);
  const showAppOptions = (appOptions: AppOptions): void => webContents.send("showAppOptions", appOptions);

  return { showGreeting, showView, showTypes, showAppOptions };
};
