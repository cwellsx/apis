import { BrowserWindow } from "electron";
import type { AppOptions, MainApi, MouseEvent, View, ViewData, ViewOptions, ViewType } from "../shared-types";
import { getMethodId } from "./convertLoadedToMembers";
import { NodeId, convertLoadedToMethods } from "./convertLoadedToMethods";
import { convertLoadedToReferences } from "./convertLoadedToReferences";
import { convertLoadedToTypes } from "./convertLoadedToTypes";
import { log } from "./log";
import { hide, showAdjacent } from "./onGraphClick";
import { renderer as createRenderer, show as createShow } from "./show";
import { SqlConfig, SqlLoaded } from "./sqlTables";

export type AppWindow = {
  mainApi: MainApi;
  window: BrowserWindow;
  showReferences: () => void;
};

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
    onGraphClick: (id: string, viewType: ViewType, event: MouseEvent): void => {
      log("onGraphClick");
      if (viewType == "references") {
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
          log("show.types");
          renderer.showTypes(types);
        }
      }
    },
    onDetailClick: (assemblyId, id): void => {
      log("onDetailClick");
      const methodId = getMethodId(id);
      if (!methodId) return; // user clicked on something other than a method
      showMethods({ assemblyName: assemblyId, metadataToken: methodId });
    },
  };

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
    log("show.view");
    showView(viewData, sqlLoaded);
  };

  const showView = (viewData: ViewData, sqlLoaded: SqlLoaded): void => {
    const view: View = {
      ...viewData,
      dataSourceId: { cachedWhen: sqlLoaded.viewState.cachedWhen, hash: sqlLoaded.viewState.hashDataSource },
    };
    log("show.view");
    renderer.showView(view);
  };

  window.setTitle(title);
  renderer.showAppOptions(sqlConfig.appOptions);

  return { mainApi, window, showReferences };
};
