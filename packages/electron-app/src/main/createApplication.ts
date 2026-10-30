import { hello, log, setPaths } from "backend-api";
import { BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { IPC_CHANNELS } from "../shared";
import { registerFileProtocol } from "./convertPathToUrl";
import { createAppOpened } from "./createAppOpened";
import { loadURL } from "./createBrowserWindow";
import { onElectronEvents } from "./onEvents";

/*
  Assume that complicated functions can be defined but not run, before this function is called.
  So other modules export data and function definitions, but don't invoke functions when they're imported.

  The fact that open needs a lot of parameters suggests it isn't natural to split it from this module --
  but doing so keeps the source files shorter, so more readable.
*/

declare const CORE_EXE: string;

const nativeBinding = path.join(process.cwd(), ".webpack\\main\\native_modules\\build\\Release\\better_sqlite3.node");

export const createApplication = async (mainWindow: BrowserWindow, appDataPath: string): Promise<void> => {
  setPaths({ appDataPath, coreExePath: CORE_EXE, sqlNodePath: nativeBinding });

  log(`CORE_EXE is ${CORE_EXE}`);
  log(`cwd is ${process.cwd()}`);
  log(`script path is ${__dirname}`);
  const helloMessage = hello();
  log(helloMessage);
  log(`electron version is ${process.versions.electron}`);

  registerFileProtocol();

  // TODO this ignores the fact that onEvents returns a promise
  ipcMain.on(IPC_CHANNELS.onEvents, onElectronEvents);

  await loadURL(mainWindow);
  log("onRendererLoaded");
  await createAppOpened(mainWindow);
};
