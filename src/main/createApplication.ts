import { BrowserWindow, ipcMain } from "electron";
import type { AppOptions, MainApi, MouseEvent, View, ViewData, ViewOptions, ViewType } from "../shared-types";
import { getMethodId } from "./convertLoadedToMembers";
import { NodeId, convertLoadedToMethods } from "./convertLoadedToMethods";
import { convertLoadedToReferences } from "./convertLoadedToReferences";
import { convertLoadedToTypes } from "./convertLoadedToTypes";
import { registerFileProtocol } from "./convertPathToUrl";
import { DotNetApi, createDotNetApi } from "./createDotNetApi";
import { getAppFilename, writeFileSync } from "./fs";
import type { Reflected } from "./loaded";
import { loadedVersion } from "./loaded";
import { log } from "./log";
import { hide, showAdjacent } from "./onGraphClick";
import { open } from "./open";
import { readCoreJson, whenCoreJson } from "./readCoreJson";
import { options } from "./shared-types";
import { IShow, Show } from "./show";
import { showErrorBox } from "./showErrorBox";
import { DataSource, SqlLoaded, createSqlConfig, createSqlLoaded } from "./sqlTables";

/*
  Assume that complicated functions can be defined but not run, before this function is called.
  So other modules export data and function definitions, but don't invoke functions when they're imported.

  These APIs are created when this function is run:
  - mainApi
  - renderApi
  - dotNetApi
  - sqlTables

  So these are local variables of this function, and injected into the function which needs them --
  specifically the open function, whose contents were previously inline this module.

  The fact that open needs a lot of parameters suggests it isn't natural to split it from this module --
  but doing so keeps the source files shorter, so more readable.
*/

declare const CORE_EXE: string;
log(`CORE_EXE is ${CORE_EXE}`);

export function createApplication(mainWindow: BrowserWindow): void {
  registerFileProtocol();

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

  // implement the MainApi and bind it to ipcMain
  const mainApi: MainApi = {
    setViewOptions: (viewOptions: ViewOptions): void => {
      log("setGroupExpanded");
      if (!sqlLoaded) return;
      switch (viewOptions.viewType) {
        case "references":
          sqlLoaded.viewState.referenceViewOptions = viewOptions;
          showReferences(sqlLoaded);
          break;
        case "methods":
          sqlLoaded.viewState.methodViewOptions = viewOptions;
          showMethods(sqlLoaded);
          break;
      }
    },
    setAppOptions: (appOptions: AppOptions): void => {
      log("setAppOptions");
      if (!sqlLoaded) return;
      sqlConfig.appOptions = appOptions;
      show.appOptions(appOptions);
    },
    onGraphClick: (id: string, viewType: ViewType, event: MouseEvent): void => {
      log("onGraphClick");
      if (!sqlLoaded) return;
      if (viewType == "references") {
        const assemblyReferences = sqlLoaded.readAssemblyReferences();
        if (event.shiftKey) {
          const viewOptions = sqlLoaded.viewState.referenceViewOptions;
          showAdjacent(assemblyReferences, viewOptions, id);
          sqlLoaded.viewState.referenceViewOptions = viewOptions;
          showReferences(sqlLoaded);
        } else if (event.ctrlKey) {
          const viewOptions = sqlLoaded.viewState.referenceViewOptions;
          hide(assemblyReferences, viewOptions, id);
          sqlLoaded.viewState.referenceViewOptions = viewOptions;
          showReferences(sqlLoaded);
        } else {
          const allTypeInfo = sqlLoaded.readTypes(id);
          const types = convertLoadedToTypes(allTypeInfo, id);
          log("show.types");
          show.types(types);
        }
      }
    },
    onDetailClick: (assemblyId, id): void => {
      log("onDetailClick");
      if (!sqlLoaded) return;
      const methodId = getMethodId(id);
      if (!methodId) return; // user clicked on something other than a method
      showMethods(sqlLoaded, { assemblyName: assemblyId, metadataToken: methodId });
    },
  };

  ipcMain.on("setViewOptions", (event, viewOptions) => mainApi.setViewOptions(viewOptions));
  ipcMain.on("setAppOptions", (event, appOptions) => mainApi.setAppOptions(appOptions));
  ipcMain.on("onGraphClick", (event, id, viewType, mouseEvent) => mainApi.onGraphClick(id, viewType, mouseEvent));
  ipcMain.on("onDetailClick", (event, assemblyId, id) => mainApi.onDetailClick(assemblyId, id));

  // wrap use of the renderer API
  const show: IShow = new Show(mainWindow);

  const showMethods = (sqlLoaded: SqlLoaded, methodId?: NodeId): void => {
    try {
      const readMethod = sqlLoaded.readMethod.bind(sqlLoaded);
      const methodViewOptions = sqlLoaded.viewState.methodViewOptions;
      const viewData = convertLoadedToMethods(readMethod, methodViewOptions, methodId);
      if (methodId) sqlLoaded.viewState.methodViewOptions = methodViewOptions;
      showView(viewData, sqlLoaded);
    } catch (error) {
      show.exception(error);
    }
  };

  const showReferences = (sqlLoaded: SqlLoaded): void => {
    const viewData = convertLoadedToReferences(
      sqlLoaded.readAssemblyReferences(),
      sqlLoaded.viewState.referenceViewOptions,
      sqlLoaded.viewState.exes
    );
    log("show.view");
    showView(viewData, sqlLoaded);
  };

  const showView = (viewData: ViewData, sqlLoaded: SqlLoaded): void => {
    const view: View = {
      ...viewData,
      dataSourceId: { cachedWhen: sqlLoaded.viewState.cachedWhen, hash: sqlLoaded.viewState.hashDataSource },
    };
    log("show.view");
    show.view(view);
  };

  const openSqlLoaded = async (
    dataSource: DataSource,
    when: string,
    getReflected: (path: string) => Promise<Reflected>
  ): Promise<void> => {
    sqlLoaded = changeSqlLoaded(dataSource);
    if (
      options.alwaysReload ||
      !sqlLoaded.viewState.cachedWhen ||
      loadedVersion !== sqlLoaded.viewState.loadedVersion ||
      Date.parse(sqlLoaded.viewState.cachedWhen) < Date.parse(when)
    ) {
      log("getLoaded");
      const reflected = await getReflected(dataSource.path);
      // save Reflected
      const jsonPath = getAppFilename(`Reflected.${dataSource.hash}.json`);
      writeFileSync(jsonPath, JSON.stringify(reflected, null, " "));
      sqlLoaded.save(reflected, when, dataSource.hash);
    } else log("!getLoaded");
    mainWindow.setTitle(dataSource.path);
    showReferences(sqlLoaded);
  };

  const readDotNetApi = async (path: string): Promise<Reflected> => {
    const json = await dotNetApi.getJson(path);
    const reflected = JSON.parse(json);
    return reflected;
  };

  // the caller wraps this with a try/catch handler
  const onOpen = async (dataSource: DataSource): Promise<void> => {
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
  };

  async function onRendererLoaded(): Promise<void> {
    log("onRendererLoaded");
    show.appOptions(sqlConfig.appOptions);
    await open(mainWindow, show, onOpen, sqlConfig);
  }

  mainWindow.webContents.once("did-finish-load", onRendererLoaded);
}
