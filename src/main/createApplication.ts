import { BrowserWindow, dialog, ipcMain } from "electron";
import type { Groups, LeafNode, MainApi, RendererApi, View } from "../shared-types";
import { isParent } from "../shared-types";
import { convertLoadedToGroups } from "./convertLoadedToGroups";
import { registerFileProtocol } from "./convertPathToUrl";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { createImage } from "./createImage";
import { getErrorString } from "./error";
import { getAppFilename, pathJoin } from "./getAppFilename";
import { hash } from "./hash";
import { log } from "./log";
import { createMenu } from "./menu";
import { readCoreJson, whenCoreJson } from "./readCoreJson";
import type { Edge, Loaded, StringPredicate } from "./shared-types";
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
    setLeafVisible: (names: string[]): void => {
      log("setLeafVisible");
      if (!sqlLoaded) return;
      sqlLoaded.viewState.leafVisible = names;
      showSqlLoaded(sqlLoaded, false);
    },
    setGroupExpanded: (names: string[]): void => {
      log("setGroupExpanded");
      if (!sqlLoaded) return;
      sqlLoaded.viewState.groupExpanded = names;
      showSqlLoaded(sqlLoaded, false);
    },
  };
  // and bind ipcMain to these MainApi methods
  ipcMain.on("setLeafVisible", (event, names) => mainApi.setLeafVisible(names));
  ipcMain.on("setGroupExpanded", (event, names) => mainApi.setGroupExpanded(names));

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
    showSqlLoaded(sqlLoaded, true);
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
          await reopenSqlLoaded(dataSource, await dotNetApi.getWhen(dataSource.path), readDotNetApi);
          break;
        case "coreJson":
          await reopenSqlLoaded(dataSource, await whenCoreJson(dataSource.path), readCoreJson);
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
      showException(error);
    }
  };

  const openAssemblies = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(mainWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies", hash: hash(path) };
    await reopenDataSource(dataSource);
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
    await reopenDataSource(dataSource);
  };
  const openRecent = async (path: string): Promise<void> => {
    const type = sqlConfig.recent().find((it) => it.path === path)?.type;
    if (!type) throw new Error("Unknown recent path");
    const dataSource: DataSource = { path, type, hash: hash(path) };
    await reopenDataSource(dataSource);
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

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    if (sqlConfig.dataSource) {
      await reopenDataSource(sqlConfig.dataSource);
    } else {
      showMessage("No data", "Use the File menu, to open a data source.");
    }
  }

  const createLookup = (array: string[]): StringPredicate => {
    const temp = new Set(array);
    return (id: string) => temp.has(id);
  };

  function showSqlLoaded(sqlLoaded: SqlLoaded, first: boolean): void {
    log("showSqlLoaded");
    // maybe we needn't read Loaded and calculate Groups more than once, but for now we do it every time
    const loaded: Loaded = sqlLoaded.read();
    const leafs: LeafNode[] = [];
    const edges: Edge[] = [];
    Object.entries(loaded.assemblies).forEach(([assembly, dependencies]) => {
      leafs.push({ id: assembly, label: assembly, parent: null });
      dependencies.forEach((dependency) => edges.push({ clientId: assembly, serverId: dependency }));
    });
    // the way in which Groups are created depends on the data i.e. whether it's Loaded or CustomData
    const groups = convertLoadedToGroups(loaded);
    const leafVisible = sqlLoaded.viewState.leafVisible ?? Object.keys(loaded.assemblies);
    const groupExpanded = sqlLoaded.viewState.groupExpanded ?? [];
    showGraphed(groups, leafs, edges, leafVisible, groupExpanded, first, false);
  }

  function showGraphed(
    groups: Groups,
    leafs: LeafNode[],
    edges: Edge[],
    leafVisible: string[],
    groupExpanded: string[],
    first: boolean,
    flatten: boolean
  ): void {
    const isLeafVisible = createLookup(leafVisible);
    const isGroupExpanded = createLookup(groupExpanded);
    const nodes = flatten ? leafs : groups;
    log("convertGraphedToImage");
    const image = nodes.some((node) => isParent(node) || isLeafVisible(node.id))
      ? createImage(nodes, edges, isLeafVisible, isGroupExpanded)
      : "Empty graph, no nodes to display";
    log("convertLoadedToGroups");
    const view: View = { image, groups: first ? groups : null, leafVisible, groupExpanded };
    log("showView");
    rendererApi.showView(view);
  }

  webContents.once("did-finish-load", onRendererLoaded);
}
