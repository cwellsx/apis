import type { DisplayApi, SecondDisplay } from "backend-app";
import type { AppOptions, View, ViewDetails, ViewGreeting } from "backend-ui";
import { getErrorString, log } from "backend-utils";
import type { BrowserWindow } from "electron";
import { convertPathToUrl } from "./convertPathToUrl";
import { appWindows, createBrowserWindow, loadURL } from "./createBrowserWindow";

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

  const showView = (view: View): void => webContents.send("showView", view);

  const showDetails = (details: ViewDetails): void => webContents.send("showDetails", details);

  const showAppOptions = (appOptions: AppOptions): void => webContents.send("showAppOptions", appOptions);

  const createSecondDisplay = async (delegate: SecondDisplay): Promise<void> => {
    const window = createBrowserWindow();
    // and load the index.html of the window
    await loadURL(window);
    const display = createDisplay(window);
    const appWindow = await delegate(display);
    appWindows.add(appWindow, window);
  };

  return {
    showView,
    showDetails,
    setTitle,
    showAppOptions,
    showException,
    showMessage,
    createSecondDisplay,
    convertPathToUrl,
  };
};
