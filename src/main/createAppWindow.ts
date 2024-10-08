import { BrowserWindow } from "electron";
import type {
  AppOptions,
  ClusterBy,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  GraphFilter,
  GraphViewOptions,
  MainApi,
  ViewCompiler,
  ViewDetails,
  ViewErrors,
  ViewOptions,
  ViewType,
} from "../shared-types";
import { MethodViewOptions, nodeIdToText } from "../shared-types";
import { convertLoadedToDetailedAssembly } from "./convertLoadedToDetailedAssembly";
import { convertCallstackToImage, convertLoadedToCalls, convertLoadedToCallstack } from "./convertLoadedToMethods";
import { convertLoadedToReferences } from "./convertLoadedToReferences";
import { AppWindow, appWindows, createSecondWindow } from "./createBrowserWindow";
import { createViewGraph } from "./imageDataTypes";
import { log } from "./log";
import type { SetViewMenu, ViewMenu, ViewMenuItem } from "./menu";
import { createSecondMenu } from "./menu";
import {
  getClusterNames,
  isAssemblyNodeId,
  isEdgeId,
  isMethodNodeId,
  MethodNodeId,
  removeNodeId,
  textToAnyNodeId,
  toAnyNodeId,
  toggleNodeId,
  toNodeId,
} from "./nodeIds";
import { showAdjacent } from "./onGraphClick";
import { viewFeatures } from "./shared-types";
import { renderer as createRenderer, show as createShow } from "./show";
import { SqlConfig, SqlLoaded } from "./sql";
import { CommonGraphViewType } from "./sql/sqlLoadedApiTypes";

export const createAppWindow = (
  window: BrowserWindow,
  sqlLoaded: SqlLoaded,
  sqlConfig: SqlConfig,
  dataSourcePath: string,
  setViewMenu: SetViewMenu
): AppWindow & { showMethods: (methodId?: MethodNodeId) => void } => {
  const show = createShow(window);
  const renderer = createRenderer(window);

  const createViewMenu = (): void => {
    // initialize ViewMenu before the menu is recreated
    const menuItems: ViewMenuItem[] = [
      { label: "Assembly references", viewType: "references" },
      { label: "APIs", viewType: "apis" },
    ];
    if (sqlLoaded.readErrors().length !== 0) menuItems.push({ label: ".NET reflection errors", viewType: "errors" });
    if (sqlConfig.appOptions.showCompilerGeneratedMenuItem)
      menuItems.push({ label: "Compiler-generated types", viewType: "compiler" });
    const viewMenu: ViewMenu = {
      menuItems,
      currentViewType: sqlLoaded.viewState.viewType,
      showViewType: (viewType: ViewType): void => openViewType(viewType),
    };
    setViewMenu(viewMenu);
  };
  createViewMenu();

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
      case "compiler":
        sqlLoaded.viewState.compilerViewOptions = viewOptions;
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
      createViewMenu(); // because change appOptions might affect the View menu
      renderer.showAppOptions(appOptions);
    },
    onGraphEvent: (graphEvent: GraphEvent): void => {
      const { id, viewType, event } = graphEvent;
      if (viewType === "custom") throw new Error("Unexpected viewType");
      const { leafType, details } = viewFeatures[viewType];
      if (isEdgeId(id)) {
        if (!details.includes("edge")) return;
        throw new Error("Edge details not yet implemented");
        return;
      }
      // else it's a node not an edge
      const nodeId = toAnyNodeId(id);
      if (leafType !== nodeId.type) {
        // this is a group
        const { viewOptions, clusterBy } = getGraphViewOptions(viewType);
        const graphFilter = sqlLoaded.readGraphFilter(viewType, clusterBy);
        toggleNodeId(graphFilter.groupExpanded, id);
        sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
        showViewType(viewOptions.viewType);
        return;
      }
      // else this is a leaf
      switch (viewType) {
        case "methods": {
          if (!isMethodNodeId(nodeId)) throw new Error("Expected method id");
          const viewDetails: ViewDetails = { ...sqlLoaded.readMethodDetails(nodeId), detailType: "methodDetails" };
          renderer.showDetails(viewDetails);
          return;
        }
        case "references": {
          if (!isAssemblyNodeId(nodeId)) throw new Error("Expected assembly id");
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
            removeNodeId(graphFilter.leafVisible, id);
            sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
            showReferences();
          } else {
            const typeInfos = sqlLoaded.readTypeInfos(assemblyName);
            const types = convertLoadedToDetailedAssembly(typeInfos, assemblyName);
            renderer.showDetails(types);
          }
          return;
        }
      }
    },
    onFilterEvent: (filterEvent: FilterEvent): void => {
      const { viewOptions, graphFilter } = filterEvent;
      const viewType = viewOptions.viewType;
      if (viewType === "custom") throw new Error("Unexpected viewType");
      const clusterBy = getClusterBy(viewOptions);
      sqlLoaded.writeGraphFilter(viewType, clusterBy, graphFilter);
      showViewType(viewType);
    },
    onDetailEvent: (detailEvent: DetailEvent): void => {
      const { id, viewType } = detailEvent;
      const nodeId = toAnyNodeId(id);
      if (!isMethodNodeId(nodeId)) return; // user clicked on something other than a method
      // launch in a separate window
      createSecondWindow().then((secondWindow) => {
        const { setViewMenu } = createSecondMenu(secondWindow);
        const appWindow = createAppWindow(secondWindow, sqlLoaded, sqlConfig, dataSourcePath, setViewMenu);
        secondWindow.setTitle(`Method — ${dataSourcePath}`);
        appWindow.showMethods(nodeId);
      });
    },
  };

  const showMethods = async (methodId?: MethodNodeId): Promise<void> => {
    try {
      log(`showMethods(${methodId ?? ""})`);

      const getMethodNodeId = (methodViewOptions: MethodViewOptions): MethodNodeId => {
        if (!methodViewOptions.methodId) throw new Error("No methodId");
        const nodeId = textToAnyNodeId(nodeIdToText(methodViewOptions.methodId));
        if (!isMethodNodeId(nodeId)) throw new Error("Not MethodNodeId");
        return nodeId;
      };

      const methodViewOptions = sqlLoaded.viewState.methodViewOptions;
      const callstackIterator = sqlLoaded.readCallstack(methodId ?? getMethodNodeId(methodViewOptions));
      const callstackElements = convertLoadedToCallstack(callstackIterator);

      show.showMessage(undefined, `${callstackElements.leafs.length()} records`);

      const graphFilter: GraphFilter | undefined = methodId
        ? undefined
        : sqlLoaded.readGraphFilter(methodViewOptions.viewType, methodViewOptions.showClustered.clusterBy);

      const graphData = convertCallstackToImage(
        callstackElements,
        sqlLoaded.readNames(),
        methodViewOptions,
        graphFilter
      );

      if (methodId) {
        sqlLoaded.writeGraphFilter(
          methodViewOptions.viewType,
          methodViewOptions.showClustered.clusterBy,
          graphData.graphFilter
        );
        methodViewOptions.methodId = toNodeId(methodId);
        sqlLoaded.viewState.methodViewOptions = methodViewOptions;
      }

      const viewGraph = await createViewGraph(graphData);
      renderer.showView(viewGraph);
    } catch (error) {
      show.showException(error);
    }
  };

  const showReferences = async (): Promise<void> => {
    const graphData = convertLoadedToReferences(
      sqlLoaded.readAssemblyReferences(),
      sqlLoaded.viewState.referenceViewOptions,
      sqlLoaded.readGraphFilter("references", "assembly"),
      sqlLoaded.viewState.exes
    );
    const viewGraph = await createViewGraph(graphData);
    renderer.showView(viewGraph);
  };

  const showErrors = (): void => {
    const errors = sqlLoaded.readErrors();

    const viewErrors: ViewErrors = {
      errors,
      viewType: "errors",
    };
    renderer.showView(viewErrors);
  };

  const showApis = async (): Promise<void> => {
    const apiViewOptions = sqlLoaded.viewState.apiViewOptions;
    const clusterBy = apiViewOptions.showClustered.clusterBy;
    const graphFilter = sqlLoaded.readGraphFilter("apis", clusterBy);
    const calls = sqlLoaded.readCalls(
      clusterBy,
      apiViewOptions.showInternalCalls ? getClusterNames(graphFilter.groupExpanded, clusterBy) : []
    );
    show.showMessage(undefined, `${calls.length} records`);
    const elements = convertLoadedToCalls(calls);
    const graphData = convertCallstackToImage(elements, sqlLoaded.readNames(), apiViewOptions, graphFilter);
    const viewGraph = await createViewGraph(graphData);
    renderer.showView(viewGraph);
  };

  const showCompiler = (): void => {
    const { compilerMethods, localsTypes } = sqlLoaded.readCompiler();
    const compilerViewOptions = sqlLoaded.viewState.compilerViewOptions;
    const viewCompiler: ViewCompiler = {
      compilerMethods,
      localsTypes,
      viewType: "compiler",
      textViewOptions: compilerViewOptions,
    };
    renderer.showView(viewCompiler);
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
      case "compiler":
        showCompiler();
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
      case "compiler":
        window.setTitle(`Compiler methods — ${dataSourcePath}`);
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
