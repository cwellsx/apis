import { BrowserWindow } from "electron";
import { AppOptions } from "../shared-types";

declare const SECOND_WINDOW_WEBPACK_ENTRY: string;
declare const SECOND_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export let secondWindow: BrowserWindow | undefined = undefined;

const createSecondWindow = (appOptions: AppOptions): Promise<BrowserWindow> => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: SECOND_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  window.on("closed", () => {
    secondWindow = undefined;
  });

  const promise = new Promise<BrowserWindow>((resolve) => {
    // resolve promise after window is loaded
    window.webContents.once("did-finish-load", () => {
      // TODO set appOptions in the newly-created window
      resolve(window);
    });

    // and load the index.html of the window
    window.loadURL(SECOND_WINDOW_WEBPACK_ENTRY);
    window.webContents.openDevTools();
    window.maximize();
  });

  return promise;
};

export const getSecondWindow = async (appOptions: AppOptions): Promise<BrowserWindow> =>
  secondWindow ? secondWindow : createSecondWindow(appOptions);
