import { createSqlAppConfig, existsSync, hello, log, setPaths } from "backend-api";
import { BrowserWindow } from "electron";
import path from "node:path";
import { loadRenderer } from "./createBrowserWindow";
import { createOpen } from "./createOpen";
import { bindIpcMain } from "./onEvents";
import { showErrorMessage } from "./show";

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

  // instantiate the Config SQL early in order to bind it into the onEvent function
  const appConfig = createSqlAppConfig("config.db");

  // initialize the onEvent listener before starting the renderer
  bindIpcMain(appConfig);

  // load the renderer
  await loadRenderer(mainWindow);
  log("onRendererLoaded");

  // create main menu options and define functions to open a data source
  const bindDataSource = createOpen(mainWindow, appConfig);

  // automatically reopen the previously-opened dataSource
  if (appConfig.dataSource) {
    if (existsSync(appConfig.dataSource.path)) {
      await bindDataSource(appConfig.dataSource);
    } else {
      showErrorMessage(mainWindow, "Not found", "Use the File menu, to open a data source.");
    }
  } else {
    showErrorMessage(mainWindow, "No data", "Use the File menu, to open a data source.");
  }
};
