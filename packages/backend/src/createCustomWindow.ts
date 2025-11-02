import type { DisplayApi, SetViewMenu, ViewMenuItem } from "./app-types";
import { convertLoadedToCustom } from "./convertLoadedToCustom";
import { bindImage } from "./image";
import { anyNodeIdToText, edgeIdToNodeIds, isEdgeId, isNameNodeId, toAnyNodeId, toggleNodeId } from "./nodeIds";
import type {
  AppOptions,
  CustomViewOptions,
  DetailedCustom,
  FilterEvent,
  GraphEvent,
  NodeId,
  ViewCustomErrors,
  ViewOptions,
  ViewType,
} from "./contracts-ui";
import { isCustomManual, isCustomViewOptions } from "./contracts-ui";
import { SqlConfig, SqlCustom } from "./sql";
import type { MainApiAsync } from "./types";
import { viewFeatures } from "./utils";

// this is similar to createAppWindow except with an instance of SqlCusom instead of SqlLoaded
export const createCustomWindow = async (
  display: DisplayApi,
  sqlCustom: SqlCustom,
  sqlConfig: SqlConfig,
  dataSourcePath: string,
  setViewMenu: SetViewMenu
): Promise<MainApiAsync> => {
  display.showAppOptions(sqlConfig.appOptions);

  const createViewMenu = (): void => {
    const menuItems: ViewMenuItem[] = [{ label: "Custom JSON", viewType: "custom" }];
    if (sqlCustom.readErrors().length !== 0) menuItems.push({ label: "Custom JSON syntax errors", viewType: "errors" });
    const viewMenu = {
      menuItems,
      currentViewType: sqlCustom.viewState.viewType,
      showViewType: async (viewType: ViewType): Promise<void> => await openViewType(viewType),
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

  const sendDetails = (id: NodeId): void => {
    // get all the nodes
    // they're all stored as one string in SQL so there's no API to get just one node
    const nodeId = toAnyNodeId(id);
    if (!isNameNodeId(nodeId)) throw new Error("Expected nameNodeId");
    const nodes = sqlCustom.readAll();
    const node = nodes.find((node) => node.id === nodeId.name);
    if (!node) throw new Error(`Node not found: ${anyNodeIdToText(nodeId)}`);
    const viewDetails: DetailedCustom = {
      id: node.id,
      layer: node.layer ?? "",
      details: node.details ?? [],
      detailType: "customDetails",
    };
    display.showDetails(viewDetails);
  };

  const createViewGraph = bindImage(display.convertPathToUrl);

  // implement the MainApiAsync which will be bound to ipcMain
  const mainApi: MainApiAsync = {
    onViewOptions: async (viewOptions: ViewOptions): Promise<void> => {
      setCustomViewOptions(viewOptions);
      await showViewType(viewOptions.viewType);
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    onAppOptions: async (appOptions: AppOptions): Promise<void> => {
      sqlConfig.appOptions = appOptions;
      display.showAppOptions(appOptions);
    },
    onGraphEvent: async (graphEvent: GraphEvent): Promise<void> => {
      const { id, viewType } = graphEvent;
      const { leafType } = viewFeatures[viewType];
      if (isEdgeId(id)) {
        const { serverId } = edgeIdToNodeIds(id);
        sendDetails(serverId);
        return;
      }
      const nodeId = toAnyNodeId(id);
      if (leafType !== nodeId.type) {
        // this is a group
        const viewOptions = getCustomViewOptions(viewType);
        const clusterBy = isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
        const graphFilter = sqlCustom.readGraphFilter(clusterBy);
        toggleNodeId(graphFilter.groupExpanded, id);
        sqlCustom.writeGraphFilter(clusterBy, graphFilter);
        setCustomViewOptions(viewOptions);
        await showViewType(viewOptions.viewType);
        return;
      } else {
        // else this is a leaf
        sendDetails(id);
      }
      return;
    },
    onFilterEvent: async (filterEvent: FilterEvent): Promise<void> => {
      const { viewOptions, graphFilter } = filterEvent;
      if (!isCustomViewOptions(viewOptions)) throw new Error("Unexpected viewType");
      const clusterBy = isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
      sqlCustom.writeGraphFilter(clusterBy, graphFilter);
      await showCustom();
    },
    onDetailEvent: (/* detailEvent */): Promise<void> => {
      throw Error("Not implemented");
    },
    showException: (error: unknown): void => display.showException(error),
  };

  const showCustom = async (): Promise<void> => {
    const nodes = sqlCustom.readAll();
    const viewOptions = sqlCustom.viewState.customViewOptions;
    const clusterBy = isCustomManual(viewOptions) ? viewOptions.clusterBy : undefined;
    const graphFilter = sqlCustom.readGraphFilter(clusterBy);
    const graphData = convertLoadedToCustom(nodes, viewOptions, graphFilter);
    const viewGraph = await createViewGraph(graphData);
    display.showView(viewGraph);
  };

  const showErrors = (): void => {
    const customErrors = sqlCustom.readErrors();

    const viewErrors: ViewCustomErrors = {
      customErrors,
      viewType: "customErrors",
    };
    display.showView(viewErrors);
  };

  const showViewType = async (viewType: ViewType): Promise<void> => {
    switch (viewType) {
      case "custom":
        await showCustom();
        break;
      case "errors":
        showErrors();
        break;
      default:
        throw new Error("ViewType not implemented");
    }
  };

  const openViewType = async (viewType?: ViewType): Promise<void> => {
    if (viewType) sqlCustom.viewState.viewType = viewType;
    else viewType = sqlCustom.viewState.viewType;
    switch (viewType) {
      case "custom":
        display.setTitle(`${dataSourcePath}`);
        break;
      case "errors":
        display.setTitle(`Errors — ${dataSourcePath}`);
        break;
      default:
        throw new Error("ViewType not implemented");
    }
    await showViewType(viewType);
  };

  await openViewType();

  return mainApi;
};
