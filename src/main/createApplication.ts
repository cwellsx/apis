import { app, dialog, BrowserWindow, ipcMain, IpcMainEvent, WebContents } from "electron";
import fs from "fs";
import path from "path";

import { readConfig, writeConfig } from "./configFile";
import { createDotNetApi, DotNetApi } from "./createDotNetApi";
import { createSqlDatabase, selectCats } from "./createSqlDatabase";
import { SqlTables, createSqlTables } from "./sqlTables";
import { log } from "./log";

import type { MainApi, RendererApi, Loaded } from "../shared-types";

declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);

export function createApplication(webContents: WebContents): void {
  // instantiate the DotNetApi
  const dotNetApi: DotNetApi = createDotNetApi(CORE_EXE);

  // instantiate the SqlApi
  const getDbName = (filename: string): string => {
    // beware https://www.electronjs.org/docs/latest/api/app#appgetpathname
    // says that, "it is not recommended to write large files here"
    const dir = app.getPath("userData");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return path.join(dir, filename);
  };
  const sqlTables: SqlTables = createSqlTables(getDbName("apis.db"));

  // implement RendererApi using webContents.send
  const rendererApi: RendererApi = {
    setGreeting(greeting: string): void {
      webContents.send("setGreeting", greeting);
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
  }

  function bindIpcMain() {
    // bind ipcMain to the methods of MainApiImpl
    ipcMain.on("setTitle", (event, title) => getApi(event).setTitle(title));

    function getApi(event: IpcMainEvent): MainApi {
      const window = BrowserWindow.fromWebContents(event.sender);
      return new MainApiImpl(window);
    }
  }

  bindIpcMain();

  async function onRendererLoaded(): Promise<void> {
    log("readConfig");
    const config = readConfig();
    if (!config.path) {
      const path = dialog.showOpenDialogSync({ properties: ["openDirectory"] });
      if (!path) {
        app.quit();
        return;
      }
      config.path = path[0];
      writeConfig(config);
    }

    // let loaded: Loaded;
    const when = await dotNetApi.getWhen(config.path);
    if (!config.cachedWhen || Date.parse(config.cachedWhen) < Date.parse(when)) {
      const json = await dotNetApi.getJson(config.path);
      const loaded = JSON.parse(json);
      sqlTables.save(loaded);
      config.cachedWhen = when;
      writeConfig(config);
    }
    const loaded: Loaded = sqlTables.read();

    // log("showConfig");
    // rendererApi.showConfig(config);
    // log("readConfigUI");
    // const configUI = readConfigUI();
    // log("showConfigUI");
    // rendererApi.showConfigUI(configUI);
    // showFiles(config);
  }

  function greetings(): void {
    log("getGreeting");
    dotNetApi.getGreeting("World").then((greeting: string) => {
      log(greeting);
      const names = selectCats(getDbName("cats.db")).join(", ");
      log(names);
      rendererApi.setGreeting(`${greeting} from ${names}!`);
    });
  }

  webContents.once("did-finish-load", greetings);
  webContents.addListener("did-finish-load", onRendererLoaded);
}
