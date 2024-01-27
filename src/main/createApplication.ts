import { BrowserWindow, dialog, ipcMain } from "electron";
import type { Graphed, Loaded, MainApi, RendererApi, View } from "../shared-types";
import { Config } from "./config";
import { DataSource } from "./configTypes";
import { convertGraphedToImage } from "./convertGraphedToImage";
import { convertLoadedToGraphed } from "./convertLoadedToGraphed";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { registerFileProtocol } from "./convertPathToUrl";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { getAppFilename } from "./getAppFilename";
import { hash } from "./hash";
import { log } from "./log";
import { createMenu } from "./menu";
import { showErrorBox } from "./showErrorBox";
import { SqlLoaded, createSqlConfig, createSqlLoaded } from "./sqlTables";

declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);

export function createApplication(mainWindow: BrowserWindow): void {
  registerFileProtocol();
  const webContents = mainWindow.webContents;

  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  // instantiate the Config SQL
  const config = new Config(createSqlConfig(getAppFilename("config.db")));
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
      config.setShown(names);
      showView();
    },
  };
  // and bind ipcMain to these MainApi methods
  ipcMain.on("setShown", (event, names) => mainApi.setShown(names));

  const openDataSource = async (dataSource: DataSource): Promise<void> => {
    log("openDataSource");
    sqlLoaded = changeSqlLoaded(dataSource);
    const path = dataSource.path;
    const when = await dotNetApi.getWhen(path);
    if (!config.cachedWhen || Date.parse(config.cachedWhen) < Date.parse(when)) {
      const json = await dotNetApi.getJson(path);
      const loaded = JSON.parse(json);
      sqlLoaded.save(loaded);
      config.cachedWhen = when;
    }
    mainWindow.setTitle(path);
    showView();
  };

  const openAssemblies = (): void => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies", hash: hash(path) };
    config.dataSource = dataSource;
    /*await*/ openDataSource(config.dataSource);
  };
  const openCustomJson = (): void => {
    showErrorBox("Not implemented", "This option isn't implemented yet");
  };
  createMenu(openAssemblies, openCustomJson);

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    if (config.dataSource) {
      /*await*/ openDataSource(config.dataSource);
    } else {
      mainWindow.setTitle("No data");
      rendererApi.setGreeting("Use the File menu, to open a data source.");
    }
  }

  function showView(): void {
    log("showView");
    if (!sqlLoaded) return;
    const loaded: Loaded = sqlLoaded.read();
    const graphed: Graphed = convertLoadedToGraphed(loaded);
    const image = convertGraphedToImage(graphed, config);
    const view = { ...image, nodes: convertLoadedToGroups(loaded, config), now: Date.now() };
    rendererApi.showView(view);
  }

  webContents.once("did-finish-load", onRendererLoaded);
}
