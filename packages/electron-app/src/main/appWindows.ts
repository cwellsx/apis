import { BrowserWindow, IpcMainEvent } from "electron";
import { WindowContext } from "./types";

export const appWindows = (() => {
  const instances: { [index: number]: WindowContext } = {};

  const find = (event: IpcMainEvent): WindowContext | undefined => instances[event.sender.id];
  const add = (windowContext: WindowContext): void => {
    const { browserWindow } = windowContext;
    const id = browserWindow.webContents.id;
    instances[id] = windowContext;
    browserWindow.on("closed", () => {
      delete instances[id];
    });
  };
  const closeAll = (mainWindow: BrowserWindow): void =>
    Object.entries(instances).forEach(([index, windowContext]) => {
      if (windowContext.browserWindow !== mainWindow) windowContext.browserWindow.close();
      delete instances[+index];
    });

  return { find, add, closeAll };
})();
