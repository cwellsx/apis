import { BrowserWindow, dialog, ipcMain } from "electron";
import type { Graphed, Loaded, MainApi, RendererApi, View } from "../shared-types";
import { convertGraphedToImage } from "./convertGraphedToImage";
import { convertLoadedToGraphed } from "./convertLoadedToGraphed";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { registerFileProtocol } from "./convertPathToUrl";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { getErrorString } from "./error";
import { getAppFilename, pathJoin } from "./getAppFilename";
import { hash } from "./hash";
import { log } from "./log";
import { createMenu } from "./menu";
import { readCoreJson, whenCoreJson } from "./readCoreJson";
import { showErrorBox } from "./showErrorBox";
import { DataSource, SqlLoaded, createSqlConfig, createSqlLoaded } from "./sqlTables";

declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);

export function createApplication(mainWindow: BrowserWindow): void {
  registerFileProtocol();
  const webContents = mainWindow.webContents;

  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  // instantiate the Config SQL
  const sqlConfig = createSqlConfig(getAppFilename("config.db"));
  // not yet the DataSource SQL
  let sqlLoaded: SqlLoaded | undefined;
  const changeSqlLoaded = (dataSource: DataSource): SqlLoaded => {
    log("changeSqlLoaded");
    if (sqlLoaded) sqlLoaded.close();
    return createSqlLoaded(getAppFilename(`${dataSource.type}-${dataSource.hash}`));
  };

  // implement RendererApi using webContents.send
  const rendererApi: RendererApi = {
    setGreeting(greeting: string): void {
      webContents.send("setGreeting", greeting);
    },
    showView(view: View): void {
      webContents.send("showView", view);
    },
  };

  // implement the MainApi
  const mainApi: MainApi = {
    setShown: (names: string[]): void => {
      log("setShown");
      if (!sqlLoaded) return;
      sqlLoaded.viewState.setShown(names);
      showSqlLoaded(sqlLoaded);
    },
  };
  // and bind ipcMain to these MainApi methods
  ipcMain.on("setShown", (event, names) => mainApi.setShown(names));

  const showMessage = (title: string, message: string): void => {
    mainWindow.setTitle(title);
    rendererApi.setGreeting(message);
  };

  const showException = (error: unknown): void => {
    mainWindow.setTitle("Error");
    const message = getErrorString(error);
    rendererApi.setGreeting(message);
  };

  const reopenSqlLoaded = async (
    dataSource: DataSource,
    when: string,
    getLoaded: (path: string) => Promise<Loaded>
  ): Promise<void> => {
    sqlLoaded = changeSqlLoaded(dataSource);
    if (!sqlLoaded.viewState.cachedWhen || Date.parse(sqlLoaded.viewState.cachedWhen) < Date.parse(when)) {
      const loaded = await getLoaded(dataSource.path);
      sqlLoaded.save(loaded);
      sqlLoaded.viewState.cachedWhen = when;
    }
    mainWindow.setTitle(dataSource.path);
    showSqlLoaded(sqlLoaded);
  };

  const readDotNetApi = async (path: string): Promise<Loaded> => {
    const json = await dotNetApi.getJson(path);
    const loaded = JSON.parse(json);
    return loaded;
  };

  const reopenDataSource = async (dataSource: DataSource): Promise<void> => {
    try {
      log("openDataSource");
      const path = dataSource.path;
      showMessage(`Loading ${path}`, "Loading...");
      switch (dataSource.type) {
        case "loadedAssemblies":
          return reopenSqlLoaded(dataSource, await dotNetApi.getWhen(dataSource.path), readDotNetApi);
        case "coreJson":
          return reopenSqlLoaded(dataSource, await whenCoreJson(dataSource.path), readCoreJson);
        case "customJson":
          showErrorBox("Not implemented", "This option isn't implemented yet");
          return;
      }
    } catch (error: unknown | Error) {
      showException(error);
    }
  };

  const openAssemblies = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies", hash: hash(path) };
    sqlConfig.dataSource = dataSource;
    await reopenDataSource(sqlConfig.dataSource);
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
    //readCoreJson(path);
    const dataSource: DataSource = { path, type: "coreJson", hash: hash(path) };
    sqlConfig.dataSource = dataSource;
    await reopenDataSource(sqlConfig.dataSource);
  };
  createMenu(openAssemblies, openCustomJson, openCoreJson);

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    if (sqlConfig.dataSource) {
      await reopenDataSource(sqlConfig.dataSource);
    } else {
      showMessage("No data", "Use the File menu, to open a data source.");
    }
  }

  function showSqlLoaded(sqlLoaded: SqlLoaded): void {
    log("showSqlLoaded");
    const loaded: Loaded = sqlLoaded.read();
    const graphed: Graphed = convertLoadedToGraphed(loaded);
    const isShown = (name: string) => sqlLoaded.viewState.isShown(name);
    log("convertGraphedToImage");
    const image = graphed.nodes.length ? convertGraphedToImage(graphed, isShown) : "Empty graph, no nodes to display";
    log("convertLoadedToGroups");
    const view: View = { image, groups: convertLoadedToGroups(loaded, isShown) };
    log("showView");
    rendererApi.showView(view);
  }

  webContents.once("did-finish-load", onRendererLoaded);
}
