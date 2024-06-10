import { BrowserWindow } from "electron";
import type {
  AppOptions,
  ClusterBy,
  CommonGraphViewType,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  GraphViewOptions,
  MainApi,
  MethodNodeId,
  ViewErrors,
  ViewOptions,
  ViewType,
} from "../shared-types";
import { viewFeatures } from "../shared-types";
import { convertLoadedToApis } from "./convertLoadedToApis";
import { convertLoadedToDetailedAssembly } from "./convertLoadedToDetailedAssembly";
import { convertLoadedToDetailedMethod } from "./convertLoadedToDetailedMethod";
import { convertLoadedToMethods } from "./convertLoadedToMethods";
import { convertLoadedToReferences } from "./convertLoadedToReferences";
import { AppWindow, appWindows, createSecondWindow } from "./createBrowserWindow";
import { log } from "./log";
import { showAdjacent } from "./onGraphClick";
import { getClusterNames, isEdgeId, isMethodNodeId, isNameNodeId, removeNodeId, toggleNodeId } from "./shared-types";
import { renderer as createRenderer, show as createShow } from "./show";
import { SqlConfig, SqlLoaded } from "./sqlTables";

export const createAppWindow = (
  window: BrowserWindow,
  sqlLoaded: SqlLoaded,
  sqlConfig: SqlConfig,
  dataSourcePath: string
): AppWindow & { showMethods: (methodId?: MethodNodeId) => void } => {
  const show = createShow(window);
  const renderer = createRenderer(window);

  const setViewOptions = (viewOptions: ViewOptions): void => {
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

  const getGraphViewOptions = (
    viewType: CommonGraphViewType
  ): { viewOptions: GraphViewOptions; clusterBy: ClusterBy } => {
    switch (viewType) {
      case "references": {
        const viewOptions = sqlLoaded.viewState.referenceViewOptions;
        return { viewOptions, clusterBy: "assembly" };
      }
      case "methods": {
        const viewOptions = sqlLoaded.viewState.methodViewOptions;
        return { viewOptions, clusterBy: viewOptions.showClustered.clusterBy };
      }
      case "apis": {
        const viewOptions = sqlLoaded.viewState.apiViewOptions;
        return { viewOptions, clusterBy: viewOptions.showClustered.clusterBy };
      }
    }
  };

  const getClusterBy = (viewOptions: GraphViewOptions): ClusterBy => {
    switch (viewOptions.viewType) {
      case "references":
        return "assembly";

      case "methods":
      case "apis":
        return viewOptions.showClustered.clusterBy;
      case "custom":
        throw new Error("Unexpected viewType");
    }
  };

  // implement the MainApi which will be bound to ipcMain
  const mainApi: MainApi = {
    onViewOptions: (viewOptions: ViewOptions): void => {
      setViewOptions(viewOptions);
      showViewType(viewOptions.viewType);
    },
    onAppOptions: (appOptions: AppOptions): void => {
      sqlConfig.appOptions = appOptions;
      renderer.showAppOptions(appOptions);
    },
    onGraphClick: (graphEvent: GraphEvent): void => {
      const { id, viewType, event } = graphEvent;
      if (viewType === "custom") throw new Error("Unexpected viewType");
      const { leafType, details } = viewFeatures[viewType];
      if (isEdgeId(id)) {
        if (!details.includes("edge")) return;
        throw new Error("Edge details not yet implemented");
        return;
      }
      const nodeId = id;
      if (leafType !== nodeId.type) {
        // this is a group
        const { viewOptions, clusterBy } = getGraphViewOptions(viewType);
        const graphFilter = sqlLoaded.readGraphFilter(viewType, clusterBy);
        toggleNodeId(graphFilter.groupExpanded, nodeId);
        sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
        showViewType(viewOptions.viewType);
        return;
      }
      // else this is a leaf
      switch (viewType) {
        case "methods": {
          if (!isMethodNodeId(nodeId)) throw new Error("Expected method id");
          const { assemblyName, metadataToken } = nodeId;
          const typeAndMethod = sqlLoaded.readMethod(assemblyName, metadataToken);
          const methodBody = convertLoadedToDetailedMethod(typeAndMethod);
          renderer.showDetails(methodBody);
          return;
        }
        case "references": {
          if (!isNameNodeId(nodeId, "assembly")) throw new Error("Expected assembly id");
          const { name: assemblyName } = nodeId;
          const assemblyReferences = sqlLoaded.readAssemblyReferences();
          if (event.shiftKey) {
            const { clusterBy } = getGraphViewOptions(viewType);
            const graphFilter = sqlLoaded.readGraphFilter(viewType, clusterBy);
            showAdjacent(assemblyReferences, graphFilter, assemblyName);
            sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
            showReferences();
          } else if (event.ctrlKey) {
            const { clusterBy } = getGraphViewOptions(viewType);
            const graphFilter = sqlLoaded.readGraphFilter(viewType, clusterBy);
            removeNodeId(graphFilter.leafVisible, nodeId);
            sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
            showReferences();
          } else {
            const allTypeInfo = sqlLoaded.readTypes(assemblyName);
            const types = convertLoadedToDetailedAssembly(allTypeInfo, assemblyName);
            renderer.showDetails(types);
          }
          return;
        }
      }
    },
    onGraphFilter: (filterEvent: FilterEvent): void => {
      const { viewOptions, graphFilter } = filterEvent;
      const viewType = viewOptions.viewType;
      if (viewType === "custom") throw new Error("Unexpected viewType");
      const clusterBy = getClusterBy(viewOptions);
      sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
      showViewType(viewType);
    },
    onDetailClick: (detailEvent: DetailEvent): void => {
      const { id: nodeId, viewType } = detailEvent;
      if (!isMethodNodeId(nodeId)) return; // user clicked on something other than a method
      // launch in a separate window
      createSecondWindow().then((secondWindow) => {
        const appWindow = createAppWindow(secondWindow, sqlLoaded, sqlConfig, dataSourcePath);
        secondWindow.setTitle(`Method — ${dataSourcePath}`);
        appWindow.showMethods(nodeId);
      });
    },
  };

  const showMethods = (methodId?: MethodNodeId): void => {
    try {
      log(`showMethods(${methodId ?? ""})`);
      const readMethod = sqlLoaded.readMethod.bind(sqlLoaded);
      const methodViewOptions = sqlLoaded.viewState.methodViewOptions;
      const viewGraph = convertLoadedToMethods(
        readMethod,
        methodViewOptions,
        methodId ?? sqlLoaded.readGraphFilter(methodViewOptions.viewType, methodViewOptions.showClustered.clusterBy),
        show
      );
      if (methodId) {
        sqlLoaded.writeGraphFilter(
          methodViewOptions.viewType,
          methodViewOptions.showClustered.clusterBy,
          viewGraph.graphFilter
        );
        methodViewOptions.methodId = methodId;
        sqlLoaded.viewState.methodViewOptions = methodViewOptions;
      }
      renderer.showView(viewGraph);
    } catch (error) {
      show.showException(error);
    }
  };

  const showReferences = (): void => {
    const viewGraph = convertLoadedToReferences(
      sqlLoaded.readAssemblyReferences(),
      sqlLoaded.viewState.referenceViewOptions,
      sqlLoaded.readGraphFilter("references", "assembly"),
      sqlLoaded.viewState.exes
    );
    renderer.showView(viewGraph);
  };

  const showErrors = (): void => {
    const errors = sqlLoaded.readErrors();

    const viewErrors: ViewErrors = {
      errors,
      viewOptions: {
        viewType: "errors",
      },
    };
    renderer.showView(viewErrors);
  };

  const showApis = (): void => {
    const apiViewOptions = sqlLoaded.viewState.apiViewOptions;
    const clusterBy = apiViewOptions.showClustered.clusterBy;
    const graphFilter = sqlLoaded.readGraphFilter("apis", clusterBy);
    const calls = sqlLoaded.readCalls(
      clusterBy,
      apiViewOptions.showInternalCalls ? getClusterNames(graphFilter.groupExpanded, clusterBy) : []
    );
    show.showMessage(undefined, `${calls.length} records`);
    const typeNames = sqlLoaded.readTypeNames();
    const methodNames = sqlLoaded.readMethodNames();
    const viewGraph = convertLoadedToApis(
      calls,
      apiViewOptions,
      graphFilter,
      typeNames,
      methodNames,
      sqlLoaded.viewState.exes
    );
    renderer.showView(viewGraph);
  };

  const showViewType = (viewType: ViewType): void => {
    log(`showViewType(${viewType})`);
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

  const openViewType = (viewType?: ViewType): void => {
    if (viewType) sqlLoaded.viewState.viewType = viewType;
    else viewType = sqlLoaded.viewState.viewType;
    switch (viewType) {
      case "references":
        window.setTitle(`References — ${dataSourcePath}`);
        break;
      case "methods":
        throw new Error("Expect this to be opened only in a second window");
      case "errors":
        window.setTitle(`Errors — ${dataSourcePath}`);
        break;
      case "apis":
        window.setTitle(`APIs — ${dataSourcePath}`);
        break;
      default:
        throw new Error("ViewType not implemented");
    }
    showViewType(viewType);
  };

  renderer.showAppOptions(sqlConfig.appOptions);

  const self = { mainApi, window, openViewType, showMethods };
  appWindows.add(self);
  return self;
};
