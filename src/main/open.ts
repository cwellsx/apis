import { dialog, type BrowserWindow } from "electron";
import { viewSqlLoaded } from "./convertToView";
import type { DotNetApi } from "./createDotNetApi";
import { getAppFilename, pathJoin, writeFileSync } from "./fs";
import { hash } from "./hash";
import { log } from "./log";
import { createMenu } from "./menu";
import { readCoreJson, whenCoreJson } from "./readCoreJson";
import type { Loaded } from "./shared-types";
import { loadedVersion } from "./shared-types";
import { IShow } from "./show";
import { showErrorBox } from "./showErrorBox";
import type { DataSource, SqlConfig, SqlLoaded } from "./sqlTables";

declare const CORE_EXE: string;

export const open = async (
  mainWindow: BrowserWindow,
  dotNetApi: DotNetApi,
  changeSqlLoaded: (dataSource: DataSource) => SqlLoaded,
  sqlConfig: SqlConfig,
  show: IShow
): Promise<void> => {
  //

  const openSqlLoaded = async (
    dataSource: DataSource,
    when: string,
    getLoaded: (path: string) => Promise<Loaded>
  ): Promise<void> => {
    const sqlLoaded = changeSqlLoaded(dataSource);
    if (
      !sqlLoaded.viewState.cachedWhen ||
      loadedVersion !== sqlLoaded.viewState.loadedVersion ||
      Date.parse(sqlLoaded.viewState.cachedWhen) < Date.parse(when)
    ) {
      log("getLoaded");
      const loaded = await getLoaded(dataSource.path);
      const jsonPath = getAppFilename(`Core.${dataSource.hash}.json`);
      writeFileSync(jsonPath, JSON.stringify(loaded, null, " "));
      sqlLoaded.save(loaded, when);
    } else log("!getLoaded");
    mainWindow.setTitle(dataSource.path);
    const view = viewSqlLoaded(sqlLoaded, true);
    show.view(view);
  };

  const readDotNetApi = async (path: string): Promise<Loaded> => {
    const json = await dotNetApi.getJson(path);
    const loaded = JSON.parse(json);
    return loaded;
  };

  const openDataSource = async (dataSource: DataSource): Promise<void> => {
    try {
      log("openDataSource");
      const path = dataSource.path;
      show.message(`Loading ${path}`, "Loading...");
      switch (dataSource.type) {
        case "loadedAssemblies":
          await openSqlLoaded(dataSource, await dotNetApi.getWhen(dataSource.path), readDotNetApi);
          break;
        case "coreJson":
          await openSqlLoaded(dataSource, await whenCoreJson(dataSource.path), readCoreJson);
          break;
        case "customJson":
          showErrorBox("Not implemented", "This option isn't implemented yet");
          return;
      }
      // remember as most-recently-opened iff it opens successfully
      sqlConfig.dataSource = dataSource;
      // update the list of recently opened paths by recreating the menu
      setApplicationMenu();
    } catch (error: unknown | Error) {
      show.exception(error);
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
    show.message("No data", "Use the File menu, to open a data source.");
  }
};
