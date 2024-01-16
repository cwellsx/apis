import { app, dialog, BrowserWindow, ipcMain, IpcMainEvent } from "electron";

import { Config } from "./config";
import { createDotNetApi, DotNetApi } from "./createDotNetApi";
import { getAppFilename } from "./getAppFilename";
import { SqlTables, createSqlTables } from "./sqlTables";
import { log } from "./log";
import { registerFileProtocol } from "./convertPathToUrl";

import type { MainApi, RendererApi, Loaded, View } from "../shared-types";
import { showAssemblies } from "./graphviz";
import { readNodes } from "./readNodes";

declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);

export function createApplication(mainWindow: BrowserWindow): void {
  registerFileProtocol();
  const webContents = mainWindow.webContents;
  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  // instantiate the SqlApi
  const sqlTables: SqlTables = createSqlTables(getAppFilename("apis.db"));

  // instantiate the Config
  const config = new Config(sqlTables);

  // implement RendererApi using webContents.send
  const rendererApi: RendererApi = {
    setGreeting(greeting: string): void {
      webContents.send("setGreeting", greeting);
    },
    showView(view: View): void {
      webContents.send("showView", view);
    },
  };

  // this is a light-weight class which implements the MainApi by binding it to BrowserWindow instance at run-time
  // a new instance of this class is created for each event
  class MainApiImpl implements MainApi {
    window: BrowserWindow | null;
    constructor(window: BrowserWindow | null) {
      this.window = window;
    }

    setTitle(title: string): void {
      log("setTitle");
      this.window?.setTitle(title);
    }
    setShown(names: string[]): void {
      log("setShown");
      config.setShown(names);
      showView();
    }
  }

  function bindIpcMain() {
    // bind ipcMain to the methods of MainApiImpl
    ipcMain.on("setTitle", (event, title) => getApi(event).setTitle(title));
    ipcMain.on("setShown", (event, names) => getApi(event).setShown(names));

    function getApi(event: IpcMainEvent): MainApi {
      const window = BrowserWindow.fromWebContents(event.sender);
      return new MainApiImpl(window);
    }
  }

  bindIpcMain();

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    let path = config.path;
    if (!path) {
      const paths = dialog.showOpenDialogSync({ properties: ["openDirectory"] });
      if (!paths) {
        app.quit();
        return;
      }
      path = paths[0];
      config.path = path;
    }

    const when = await dotNetApi.getWhen(path);
    if (!config.cachedWhen || Date.parse(config.cachedWhen) < Date.parse(when)) {
      const json = await dotNetApi.getJson(path);
      const loaded = JSON.parse(json);
      sqlTables.save(loaded);
      config.cachedWhen = when;
    }
    mainWindow.setTitle(path);
    showView();
  }

  function showView(): void {
    const loaded: Loaded = sqlTables.read();
    const image = showAssemblies(loaded.assemblies, config);
    const view = { ...image, nodes: readNodes(loaded.assemblies, config), now: Date.now() };
    rendererApi.showView(view);
  }

  function greetings(): void {
    log("getGreeting");
    dotNetApi.getGreeting("World").then((greeting: string) => {
      log(greeting);
      rendererApi.setGreeting(`${greeting} from Chris!`);
    });
  }

  webContents.once("did-finish-load", greetings);
  webContents.addListener("did-finish-load", onRendererLoaded);
}
