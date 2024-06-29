import { BrowserWindow } from "electron";
import type {
  AppOptions,
  CustomViewOptions,
  FilterEvent,
  GraphEvent,
  MainApi,
  ViewErrors,
  ViewOptions,
  ViewType,
} from "../shared-types";
import { viewFeatures } from "../shared-types";
import { convertLoadedToCustom } from "./convertLoadedToCustom";
import { AppWindow, appWindows } from "./createBrowserWindow";
import type { SetViewMenu, ViewMenuItem } from "./menu";
import { isEdgeId, toggleNodeId } from "./shared-types";
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
    onGraphClick: (graphEvent: GraphEvent): void => {
      const { id, viewType, event } = graphEvent;
      const { leafType, details } = viewFeatures[viewType];
      if (isEdgeId(id)) return;
      const nodeId = id;
      if (leafType !== nodeId.type) {
        // this is a group
        const viewOptions = getCustomViewOptions(viewType);
        const graphFilter = sqlCustom.readGraphFilter(viewOptions.clusterBy);
        toggleNodeId(graphFilter.groupExpanded, nodeId);
        sqlCustom.writeGraphFilter(viewOptions.clusterBy, graphFilter);
        setCustomViewOptions(viewOptions);
        showViewType(viewOptions.viewType);
        return;
      }
      // else this is a leaf
      // nothing to do
      return;
    },
    onGraphFilter: (filterEvent: FilterEvent): void => {
      const { viewOptions, graphFilter } = filterEvent;
      const isCustomViewOptions = (viewOptions: ViewOptions): viewOptions is CustomViewOptions =>
        viewOptions.viewType === "custom";
      if (!isCustomViewOptions(viewOptions)) throw new Error("Unexpected viewType");
      sqlCustom.writeGraphFilter(viewOptions.clusterBy, graphFilter);
      showCustom();
    },
    onDetailClick: (detailEvent): void => {
      // unexpected
    },
  };

  const showCustom = (): void => {
    const nodes = sqlCustom.readAll();
    const viewOptions = sqlCustom.viewState.customViewOptions;
    const graphFilter = sqlCustom.readGraphFilter(viewOptions.clusterBy);
    const viewGraph = convertLoadedToCustom(nodes, viewOptions, graphFilter);
    renderer.showView(viewGraph);
  };

  const showErrors = (): void => {
    const customErrors = sqlCustom.readErrors();

    const viewErrors: ViewErrors = {
      customErrors,
      viewType: "errors",
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
