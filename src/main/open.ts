import { dialog, type BrowserWindow } from "electron";
import { pathJoin } from "./fs";
import { hash } from "./hash";
import { createMenu } from "./menu";
import { show } from "./show";
import { showErrorBox } from "./showErrorBox";
import { SqlConfig, type DataSource } from "./sqlTables";

declare const CORE_EXE: string;

type OnOpen = (dataSource: DataSource) => Promise<void>;

export const open = async (mainWindow: BrowserWindow, onOpen: OnOpen, sqlConfig: SqlConfig): Promise<void> => {
  // wrap a try/catch handler around onOpenDataSource
  const openDataSource = async (dataSource: DataSource): Promise<void> => {
    try {
      await onOpen(dataSource);
      // remember as most-recently-opened iff it opens successfully
      sqlConfig.dataSource = dataSource;
      // update the list of recently opened paths by recreating the menu
      setApplicationMenu();
    } catch (error: unknown | Error) {
      show(mainWindow).showException(error);
    }
  };

  const openAssemblies = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies", hash: hash(path) };
    await openDataSource(dataSource);
  };

  const openCustomJson = (): void => {
    showErrorBox("Not implemented", "This option isn't implemented yet");
  };

  const openCoreJson = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Core", extensions: ["json"] }],
      defaultPath: pathJoin(CORE_EXE, "Core.json"),
    });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "coreJson", hash: hash(path) };
    await openDataSource(dataSource);
  };

  const openRecent = async (path: string): Promise<void> => {
    const type = sqlConfig.recent().find((it) => it.path === path)?.type;
    if (!type) throw new Error("Unknown recent path");
    const dataSource: DataSource = { path, type, hash: hash(path) };
    await openDataSource(dataSource);
  };

  const setApplicationMenu = (): void => {
    const recent = sqlConfig.recent();
    recent.sort((x, y) => -(x.when - y.when)); // reverse chronological
    createMenu(
      openAssemblies,
      openCustomJson,
      openCoreJson,
      recent.map((it) => it.path),
      openRecent
    );
  };
  setApplicationMenu();

  if (sqlConfig.dataSource) {
    await openDataSource(sqlConfig.dataSource);
  } else {
    show(mainWindow).showMessage("No data", "Use the File menu, to open a data source.");
  }
};
