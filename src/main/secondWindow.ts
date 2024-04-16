import { BrowserWindow } from "electron";

declare const SECOND_WINDOW_WEBPACK_ENTRY: string;
declare const SECOND_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let window: BrowserWindow | undefined = undefined;

export const secondWindow = (): BrowserWindow => {
  if (window) return window;

  window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: SECOND_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  window.on("closed", () => {
    window = undefined;
  });

  // and load the index.html of the app.
  window.loadURL(SECOND_WINDOW_WEBPACK_ENTRY);
  window.maximize();
  return window;
};
