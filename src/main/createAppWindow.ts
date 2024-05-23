import { BrowserWindow } from "electron";
import type {
  AllViewOptions,
  AppOptions,
  GraphEvent,
  GraphViewOptions,
  GraphViewType,
  MainApi,
  MethodNodeId,
  ViewErrors,
  ViewType,
} from "../shared-types";
import { isGraphViewOptions, isMethodNodeId, isNameNodeId, textToNodeId } from "../shared-types";
import { convertLoadedToApis } from "./convertLoadedToApis";
import { convertLoadedToMethodBody } from "./convertLoadedToMethodBody";
import { convertLoadedToMethods } from "./convertLoadedToMethods";
import { convertLoadedToReferences } from "./convertLoadedToReferences";
import { convertLoadedToTypes } from "./convertLoadedToTypeDetails";
import { AppWindow, appWindows, createSecondWindow } from "./createBrowserWindow";
import { log } from "./log";
import { showAdjacent } from "./onGraphClick";
import { TypeAndMethodDetails, remove } from "./shared-types";
import { renderer as createRenderer, show as createShow } from "./show";
import { SqlConfig, SqlLoaded } from "./sqlTables";

export const createAppWindow = (
  window: BrowserWindow,
  sqlLoaded: SqlLoaded,
  sqlConfig: SqlConfig,
  title: string
): AppWindow & { showMethods: (methodId?: MethodNodeId) => void } => {
  const show = createShow(window);
  const renderer = createRenderer(window);

  const setGraphViewOptions = (viewOptions: GraphViewOptions): void => {
    switch (viewOptions.viewType) {
      case "references":
        sqlLoaded.viewState.referenceViewOptions = viewOptions;
        break;
      case "methods":
        sqlLoaded.viewState.methodViewOptions = viewOptions;
        break;
      case "apis":
        sqlLoaded.viewState.apiViewOptions = viewOptions;
        break;
    }
  };

  const getGraphViewOptions = (viewType: GraphViewType): GraphViewOptions => {
    switch (viewType) {
      case "references":
        return sqlLoaded.viewState.referenceViewOptions;
      case "methods":
        return sqlLoaded.viewState.methodViewOptions;
      case "apis":
        return sqlLoaded.viewState.apiViewOptions;
      case "custom":
        throw new Error("Unexpected viewType");
    }
  };

  // implement the MainApi which will be bound to ipcMain
  const mainApi: MainApi = {
    onViewOptions: (viewOptions: AllViewOptions): void => {
      log("setGroupExpanded");
      if (isGraphViewOptions(viewOptions)) {
        setGraphViewOptions(viewOptions);
      }
      showViewType(viewOptions.viewType);
    },
    onAppOptions: (appOptions: AppOptions): void => {
      log("onAppOptions");
      sqlConfig.appOptions = appOptions;
      renderer.showAppOptions(appOptions);
    },
    onGraphClick: (graphEvent: GraphEvent): void => {
      const { id, className, viewType, event } = graphEvent;

      log(`onGraphClick ${id}`);
      if (!className) return; // edge
      const nodeId = textToNodeId(id);
      switch (className) {
        case "closed":
        case "expanded": {
          const viewOptions = getGraphViewOptions(viewType);
          if (viewOptions.groupExpanded.includes(id)) remove(viewOptions.groupExpanded, id);
          else viewOptions.groupExpanded.push(id);
          setGraphViewOptions(viewOptions);
          showViewType(viewOptions.viewType);
          return;
        }
        case "leaf":
          switch (viewType) {
            case "methods": {
              if (!isMethodNodeId(nodeId)) throw new Error("Expected method id");
              const { assemblyName, metadataToken } = nodeId;
              const typeAndMethod = sqlLoaded.readMethod(assemblyName, metadataToken);
              const methodBody = convertLoadedToMethodBody(typeAndMethod);
              log("renderer.showDetails");
              renderer.showDetails(methodBody);
              return;
            }
            case "references": {
              if (!isNameNodeId(nodeId, "assembly")) throw new Error("Expected assembly id");
              const { name: assemblyName } = nodeId;
              const assemblyReferences = sqlLoaded.readAssemblyReferences();
              if (event.shiftKey) {
                const viewOptions = sqlLoaded.viewState.referenceViewOptions;
                showAdjacent(assemblyReferences, viewOptions, assemblyName);
                sqlLoaded.viewState.referenceViewOptions = viewOptions;
                showReferences();
              } else if (event.ctrlKey) {
                const viewOptions = sqlLoaded.viewState.referenceViewOptions;
                const leafVisible = viewOptions.leafVisible ?? Object.keys(assemblyReferences);
                remove(leafVisible, id);
                viewOptions.leafVisible = leafVisible;
                sqlLoaded.viewState.referenceViewOptions = viewOptions;
                showReferences();
              } else {
                const allTypeInfo = sqlLoaded.readTypes(assemblyName);
                const types = convertLoadedToTypes(allTypeInfo, assemblyName);
                log("renderer.showDetails");
                renderer.showDetails(types);
              }
              return;
            }
          }
      }
    },
    onDetailClick: (nodeId): void => {
      log("onDetailClick");
      if (!isMethodNodeId(nodeId)) return; // user clicked on something other than a method
      // launch in a separate window
      createSecondWindow().then((secondWindow) => {
        const appWindow = createAppWindow(secondWindow, sqlLoaded, sqlConfig, "Method");
        appWindow.showMethods(nodeId);
      });
    },
  };

  const showMethods = (methodId?: MethodNodeId): void => {
    try {
      const readMethod = sqlLoaded.readMethod.bind(sqlLoaded);
      const methodViewOptions = sqlLoaded.viewState.methodViewOptions;
      const viewGraph = convertLoadedToMethods(readMethod, methodViewOptions, methodId);
      if (methodId) sqlLoaded.viewState.methodViewOptions = methodViewOptions;
      log("renderer.showView");
      renderer.showView(viewGraph);
    } catch (error) {
      show.showException(error);
    }
  };

  const showReferences = (): void => {
    const viewGraph = convertLoadedToReferences(
      sqlLoaded.readAssemblyReferences(),
      sqlLoaded.viewState.referenceViewOptions,
      sqlLoaded.viewState.exes
    );
    log("renderer.showView");
    renderer.showView(viewGraph);
  };

  const showErrors = (): void => {
    const errors = sqlLoaded.readErrors();
    const methods = errors.flatMap<TypeAndMethodDetails>((error) =>
      error.badCallInfos.map((badCallInfo) => sqlLoaded.readMethod(error.assemblyName, badCallInfo.metadataToken))
    );
    const viewErrors: ViewErrors = {
      methods: methods.map((typeAndMethod) => convertLoadedToMethodBody(typeAndMethod)),
      viewOptions: {
        viewType: "errors",
      },
    };
    log("renderer.showView");
    renderer.showView(viewErrors);
  };

  const showApis = (): void => {
    const apiViewOptions = sqlLoaded.viewState.apiViewOptions;
    const apis = sqlLoaded.readCalls(apiViewOptions.groupExpanded);
    const savedTypeInfos = sqlLoaded.readSavedTypeInfos();
    const viewGraph = convertLoadedToApis(apis, apiViewOptions, savedTypeInfos, sqlLoaded.viewState.exes);
    show.showMessage("foo", `${apis.length} records`);
    log("renderer.showView");
    renderer.showView(viewGraph);
  };

  const showViewType = (viewType?: ViewType): void => {
    if (viewType) sqlLoaded.viewState.viewType = viewType;
    else viewType = sqlLoaded.viewState.viewType;
    switch (viewType) {
      case "references":
        showReferences();
        break;
      case "methods":
        showMethods();
        break;
      case "errors":
        showErrors();
        break;
      case "apis":
        showApis();
        break;
      default:
        throw new Error("ViewType not implemented");
    }
  };

  window.setTitle(title);
  renderer.showAppOptions(sqlConfig.appOptions);

  const self = { mainApi, window, showViewType, showMethods };
  appWindows.add(self);
  return self;
};
