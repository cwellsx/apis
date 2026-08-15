import { getErrorString, log } from "backend-api";
import type { DisplayApi, SecondDisplay } from "backend-app";
import type { AppOptions, View, ViewDetails, ViewGreeting } from "backend-ui";
import type { BrowserWindow } from "electron";
import { convertPathToUrl } from "./convertPathToUrl";
import { appWindows, createBrowserWindow, loadURL } from "./createBrowserWindow";

export const showErrorMessage = (mainWindow: BrowserWindow, title: string | undefined, message: string): void => {
  if (title) mainWindow.setTitle(title);
  const view: ViewGreeting = { greeting: message, viewType: "greeting" };
  mainWindow.webContents.send("showView", view);
};

export const showException = (mainWindow: BrowserWindow, error: unknown): void => {
  const message = getErrorString(error);
  showErrorMessage(mainWindow, "Error", message);
};

export const createDisplay = (mainWindow: BrowserWindow, dataSourcePath: string): DisplayApi => {
  const webContents = mainWindow.webContents;

  const showView = (view: View): void => webContents.send("showView", view);

  const showDetails = (details: ViewDetails): void => webContents.send("showDetails", details);

  const showAppOptions = (appOptions: AppOptions): void => webContents.send("showAppOptions", appOptions);

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

  const showLoadingMessage = (title: string | undefined, message: string): void => {
    if (title) mainWindow.setTitle(title);
    showGreeting(message);
  };

  const showTitle = (title: string): void => {
    mainWindow.setTitle(`${title} — ${dataSourcePath}`);
  };

  const createSecondDisplay = async (delegate: SecondDisplay): Promise<void> => {
    const window = createBrowserWindow();
    // and load the index.html of the window
    await loadURL(window);
    const display = createDisplay(window, dataSourcePath);
    const appWindow = await delegate(display);
    appWindows.add(appWindow, window);
  };

  return {
    showView,
    showDetails,
    showTitle,
    showAppOptions,
    showException,
    showLoadingMessage,
    createSecondDisplay,
    convertPathToUrl,
  };
};
