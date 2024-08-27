import { BrowserWindow } from "electron";
import type {
  AppOptions,
  CustomViewOptions,
  DetailedCustom,
  FilterEvent,
  GraphEvent,
  MainApi,
  NodeId,
  ViewCustomErrors,
  ViewOptions,
  ViewType,
} from "../shared-types";
import { isCustomManual, isCustomViewOptions } from "../shared-types";
import { convertLoadedToCustom } from "./convertLoadedToCustom";
import { AppWindow, appWindows } from "./createBrowserWindow";
import { createViewGraph } from "./imageDataTypes";
import type { SetViewMenu, ViewMenuItem } from "./menu";
import { isEdgeId, isNameNodeId, toggleNodeId, viewFeatures } from "./shared-types";
import { renderer as createRenderer } from "./show";
import { SqlConfig, SqlCustom } from "./sql";

// this is similar to createAppWindow except with an instance of SqlCusom instead of SqlLoaded
export const createCustomWindow = (
  window: BrowserWindow,
  sqlCustom: SqlCustom,
  sqlConfig: SqlConfig,
  dataSourcePath: string,
  setViewMenu: SetViewMenu
): AppWindow => {
  const renderer = createRenderer(window);
  renderer.showAppOptions(sqlConfig.appOptions);

  const createViewMenu = (): void => {
    const menuItems: ViewMenuItem[] = [{ label: "Custom JSON", viewType: "custom" }];
    if (sqlCustom.readErrors().length !== 0) menuItems.push({ label: "Custom JSON syntax errors", viewType: "errors" });
    const viewMenu = {
      menuItems,
      currentViewType: sqlCustom.viewState.viewType,
      showViewType: (viewType: ViewType): void => openViewType(viewType),
    };
    setViewMenu(viewMenu);
  };
  createViewMenu();

  const setCustomViewOptions = (viewOptions: ViewOptions): void => {
    switch (viewOptions.viewType) {
      case "custom":
        sqlCustom.viewState.customViewOptions = viewOptions;
        break;
      default:
        throw new Error("Unexpected options type");
    }
  };

  const getCustomViewOptions = (viewType: ViewType): CustomViewOptions => {
    switch (viewType) {
      case "custom":
        return sqlCustom.viewState.customViewOptions;
      default:
        throw new Error("Unexpected options type");
    }
  };

  const sendDetails = (nodeId: NodeId): void => {
    // get all the nodes
    // they're all stored as one string in SQL so there's no API to get just one node
    if (!isNameNodeId(nodeId)) throw new Error("Expected nameNodeId");
    const nodes = sqlCustom.readAll();
    const node = nodes.find((node) => node.id === nodeId.name);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    const viewDetails: DetailedCustom = {
      id: node.id,
      layer: node.layer ?? "",
      details: node.details ?? [],
      detailType: "customDetails",
    };
    renderer.showDetails(viewDetails);
  };

  // implement the MainApi which will be bound to ipcMain
  const mainApi: MainApi = {
    onViewOptions: (viewOptions: ViewOptions): void => {
      setCustomViewOptions(viewOptions);
      showViewType(viewOptions.viewType);
    },
    onAppOptions: (appOptions: AppOptions): void => {
      sqlConfig.appOptions = appOptions;
      renderer.showAppOptions(appOptions);
    },
    onGraphEvent: (graphEvent: GraphEvent): void => {
      const { id, viewType, event } = graphEvent;
      const { leafType, details } = viewFeatures[viewType];
      if (isEdgeId(id)) {
        sendDetails(id.serverId);
        return;
      }
      const nodeId = id;
      if (leafType !== nodeId.type) {
        // this is a group
        const viewOptions = getCustomViewOptions(viewType);
        const clusterBy = isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
        const graphFilter = sqlCustom.readGraphFilter(clusterBy);
        toggleNodeId(graphFilter.groupExpanded, nodeId);
        sqlCustom.writeGraphFilter(clusterBy, graphFilter);
        setCustomViewOptions(viewOptions);
        showViewType(viewOptions.viewType);
        return;
      } else {
        // else this is a leaf
        sendDetails(nodeId);
      }
      return;
    },
    onFilterEvent: (filterEvent: FilterEvent): void => {
      const { viewOptions, graphFilter } = filterEvent;
      if (!isCustomViewOptions(viewOptions)) throw new Error("Unexpected viewType");
      const clusterBy = isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
      sqlCustom.writeGraphFilter(clusterBy, graphFilter);
      showCustom();
    },
    onDetailEvent: (detailEvent): void => {
      // unexpected
    },
  };

  const showCustom = async (): Promise<void> => {
    const nodes = sqlCustom.readAll();
    const viewOptions = sqlCustom.viewState.customViewOptions;
    const clusterBy = isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
    const graphFilter = sqlCustom.readGraphFilter(clusterBy);
    const graphData = convertLoadedToCustom(nodes, viewOptions, graphFilter);
    const viewGraph = await createViewGraph(graphData);
    renderer.showView(viewGraph);
  };

  const showErrors = (): void => {
    const customErrors = sqlCustom.readErrors();

    const viewErrors: ViewCustomErrors = {
      customErrors,
      viewType: "customErrors",
    };
    renderer.showView(viewErrors);
  };

  const showViewType = (viewType: ViewType): void => {
    switch (viewType) {
      case "custom":
        showCustom();
        break;
      case "errors":
        showErrors();
        break;
      default:
        throw new Error("ViewType not implemented");
    }
  };

  const openViewType = (viewType?: ViewType): void => {
    if (viewType) sqlCustom.viewState.viewType = viewType;
    else viewType = sqlCustom.viewState.viewType;
    switch (viewType) {
      case "custom":
        window.setTitle(`${dataSourcePath}`);
        break;
      case "errors":
        window.setTitle(`Errors — ${dataSourcePath}`);
        break;
      default:
        throw new Error("ViewType not implemented");
    }
    showViewType(viewType);
  };

  const self = { mainApi, window, openViewType };
  appWindows.add(self);
  return self;
};
