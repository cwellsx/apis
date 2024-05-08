import { BrowserWindow, IpcMainEvent } from "electron";
import type { AppOptions, GraphEvent, MainApi, View, ViewData, ViewOptions, ViewType } from "../shared-types";
import { getMethodId } from "./convertLoadedToMembers";
import { convertLoadedToMethodBody } from "./convertLoadedToMethodBody";
import { NodeId, convertLoadedToMethods, fromStringId } from "./convertLoadedToMethods";
import { convertLoadedToReferences } from "./convertLoadedToReferences";
import { convertLoadedToTypes } from "./convertLoadedToTypes";
import { createBrowserWindow, loadURL } from "./createBrowserWindow";
import { log } from "./log";
import { hide, showAdjacent } from "./onGraphClick";
import { remove } from "./shared-types";
import { renderer as createRenderer, show as createShow } from "./show";
import { SqlConfig, SqlLoaded } from "./sqlTables";

const createSecondWindow = (): Promise<BrowserWindow> => {
  const window = createBrowserWindow();

  const promise = new Promise<BrowserWindow>((resolve) => {
    // resolve promise after window is loaded
    window.webContents.once("did-finish-load", () => {
      // TODO set appOptions in the newly-created window
      resolve(window);
    });

    // and load the index.html of the window
    loadURL(window);
    //window.webContents.openDevTools();
    window.maximize();
  });

  return promise;
};

export type AppWindow = {
  mainApi: MainApi;
  window: BrowserWindow;
  showViewType: () => void;
  showMethods: (methodId?: NodeId) => void;
};

export const appWindows = (() => {
  const instances: { [index: number]: AppWindow } = {};

  const find = (event: IpcMainEvent): AppWindow | undefined => instances[event.sender.id];
  const add = (appWindow: AppWindow): void => {
    const id = appWindow.window.webContents.id;
    instances[id] = appWindow;
    appWindow.window.on("closed", () => {
      delete instances[id];
    });
  };
  const closeAll = (mainWindow: BrowserWindow): void =>
    Object.entries(instances).forEach(([index, appWindow]) => {
      if (appWindow.window !== mainWindow) appWindow.window.close();
      delete instances[+index];
    });

  return { find, add, closeAll };
})();

export const createAppWindow = (
  window: BrowserWindow,
  sqlLoaded: SqlLoaded,
  sqlConfig: SqlConfig,
  title: string
): AppWindow => {
  const show = createShow(window);
  const renderer = createRenderer(window);

  // implement the MainApi and bind it to ipcMain
  const mainApi: MainApi = {
    onViewOptions: (viewOptions: ViewOptions): void => {
      log("setGroupExpanded");
      switch (viewOptions.viewType) {
        case "references":
          sqlLoaded.viewState.referenceViewOptions = viewOptions;
          showReferences();
          break;
        case "methods":
          sqlLoaded.viewState.methodViewOptions = viewOptions;
          showMethods();
          break;
      }
    },
    onAppOptions: (appOptions: AppOptions): void => {
      log("onAppOptions");
      sqlConfig.appOptions = appOptions;
      renderer.showAppOptions(appOptions);
    },
    onGraphClick: (graphEvent: GraphEvent): void => {
      const { id, className, viewType, event } = graphEvent;
      log(`onGraphClick ${id}`);
      switch (viewType) {
        case "methods": {
          switch (className) {
            case "closed":
            case "expanded": {
              const viewOptions = sqlLoaded.viewState.methodViewOptions;
              if (viewOptions.groupExpanded.includes(id)) remove(viewOptions.groupExpanded, id);
              else viewOptions.groupExpanded.push(id);
              sqlLoaded.viewState.methodViewOptions = viewOptions;
              showMethods();
              return;
            }
            case "leaf": {
              const { assemblyName, metadataToken } = fromStringId(id);
              const typeAndMethod = sqlLoaded.readMethod(assemblyName, metadataToken);
              const methodBody = convertLoadedToMethodBody(typeAndMethod);
              log("renderer.showMethodBody");
              renderer.showMethodBody(methodBody);
              return;
            }
            default:
              return;
          }
        }
        case "references": {
          switch (className) {
            case "closed":
            case "expanded": {
              // this is a group of assemblies, not the id of an assembly
              const viewOptions = sqlLoaded.viewState.referenceViewOptions;
              if (viewOptions.groupExpanded.includes(id)) remove(viewOptions.groupExpanded, id);
              else viewOptions.groupExpanded.push(id);
              sqlLoaded.viewState.referenceViewOptions = viewOptions;
              showReferences();
              return;
            }
            case "leaf": {
              const assemblyReferences = sqlLoaded.readAssemblyReferences();
              if (event.shiftKey) {
                const viewOptions = sqlLoaded.viewState.referenceViewOptions;
                showAdjacent(assemblyReferences, viewOptions, id);
                sqlLoaded.viewState.referenceViewOptions = viewOptions;
                showReferences();
              } else if (event.ctrlKey) {
                const viewOptions = sqlLoaded.viewState.referenceViewOptions;
                hide(assemblyReferences, viewOptions, id);
                sqlLoaded.viewState.referenceViewOptions = viewOptions;
                showReferences();
              } else {
                const allTypeInfo = sqlLoaded.readTypes(id);
                const types = convertLoadedToTypes(allTypeInfo, id);
                log("renderer.showTypes");
                renderer.showTypes(types);
              }
              return;
            }
            default:
              return;
          }
        }
      }
    },
    onDetailClick: (assemblyId, id): void => {
      log("onDetailClick");
      const methodId = getMethodId(id);
      if (!methodId) return; // user clicked on something other than a method
      // launch in a separate window
      createSecondWindow().then((secondWindow) => {
        const appWindow = createAppWindow(secondWindow, sqlLoaded, sqlConfig, "Method");
        appWindow.showMethods({ assemblyName: assemblyId, metadataToken: methodId });
      });
    },
  };

  // const showApis = (): void =>{

  // }

  const showMethods = (methodId?: NodeId): void => {
    try {
      const readMethod = sqlLoaded.readMethod.bind(sqlLoaded);
      const methodViewOptions = sqlLoaded.viewState.methodViewOptions;
      const viewData = convertLoadedToMethods(readMethod, methodViewOptions, methodId);
      if (methodId) sqlLoaded.viewState.methodViewOptions = methodViewOptions;
      showView(viewData, sqlLoaded);
    } catch (error) {
      show.showException(error);
    }
  };

  const showReferences = (): void => {
    const viewData = convertLoadedToReferences(
      sqlLoaded.readAssemblyReferences(),
      sqlLoaded.viewState.referenceViewOptions,
      sqlLoaded.viewState.exes
    );
    showView(viewData, sqlLoaded);
  };

  const showViewType = (viewType?: ViewType): void => {
    if (viewType) sqlLoaded.viewState.viewType = viewType;
    else viewType = sqlLoaded.viewState.viewType;
    switch (viewType) {
      case "references":
        showReferences();
        break;
      default:
        throw new Error("ViewType not implemented");
    }
  };

  const showView = (viewData: ViewData, sqlLoaded: SqlLoaded): void => {
    const view: View = {
      ...viewData,
      dataSourceId: { cachedWhen: sqlLoaded.viewState.cachedWhen, hash: sqlLoaded.viewState.hashDataSource },
    };
    log("renderer.showView");
    renderer.showView(view);
  };

  window.setTitle(title);
  renderer.showAppOptions(sqlConfig.appOptions);

  const self: AppWindow = { mainApi, window, showViewType, showMethods };
  appWindows.add(self);
  return self;
};
