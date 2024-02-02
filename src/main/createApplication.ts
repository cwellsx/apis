import { BrowserWindow, dialog, ipcMain } from "electron";
import type { Graphed, Loaded, MainApi, RendererApi, View } from "../shared-types";
import { convertGraphedToImage } from "./convertGraphedToImage";
import { convertLoadedToGraphed } from "./convertLoadedToGraphed";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { registerFileProtocol } from "./convertPathToUrl";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { getErrorString } from "./error";
import { getAppFilename } from "./getAppFilename";
import { hash } from "./hash";
import { log } from "./log";
import { createMenu } from "./menu";
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
      showView(sqlLoaded);
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

  const openDataSource = async (dataSource: DataSource): Promise<void> => {
    try {
      log("openDataSource");
      const path = dataSource.path;
      showMessage(`Loading ${path}`, "Loading...");
      sqlLoaded = changeSqlLoaded(dataSource);
      const when = await dotNetApi.getWhen(path);
      if (!sqlLoaded.viewState.cachedWhen || Date.parse(sqlLoaded.viewState.cachedWhen) < Date.parse(when)) {
        const json = await dotNetApi.getJson(path);
        const loaded = JSON.parse(json);
        sqlLoaded.save(loaded);
        sqlLoaded.viewState.cachedWhen = when;
      }
      mainWindow.setTitle(path);
      showView(sqlLoaded);
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
    await openDataSource(sqlConfig.dataSource);
  };
  const openCustomJson = (): void => {
    showErrorBox("Not implemented", "This option isn't implemented yet");
  };
  createMenu(openAssemblies, openCustomJson);

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    if (sqlConfig.dataSource) {
      await openDataSource(sqlConfig.dataSource);
    } else {
      showMessage("No data", "Use the File menu, to open a data source.");
    }
  }

  function showView(sqlLoaded: SqlLoaded): void {
    log("showView");
    const loaded: Loaded = sqlLoaded.read();
    const graphed: Graphed = convertLoadedToGraphed(loaded);
    const isShown = (name: string) => sqlLoaded.viewState.isShown(name);
    const image = graphed.nodes.length ? convertGraphedToImage(graphed, isShown) : "Empty graph, no nodes to display";
    const view: View = { image, groups: convertLoadedToGroups(loaded, isShown) };
    rendererApi.showView(view);
  }

  webContents.once("did-finish-load", onRendererLoaded);
}
