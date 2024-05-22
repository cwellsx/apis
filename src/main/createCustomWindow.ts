import { BrowserWindow } from "electron";
import type {
  AllViewOptions,
  AppOptions,
  CustomViewOptions,
  GraphEvent,
  MainApi,
  ViewErrors,
  ViewType,
} from "../shared-types";
import { convertLoadedToCustom } from "./convertLoadedToCustom";
import { AppWindow, appWindows } from "./createBrowserWindow";
import { log } from "./log";
import { remove } from "./shared-types";
import { renderer as createRenderer, show as createShow } from "./show";
import { SqlConfig, SqlCustom } from "./sqlTables";

// this is similar to createAppWindow except with an instance of SqlCusom instead of SqlLoaded
export const createCustomWindow = (
  window: BrowserWindow,
  sqlCustom: SqlCustom,
  sqlConfig: SqlConfig,
  title: string
): AppWindow => {
  const show = createShow(window);
  const renderer = createRenderer(window);
  window.setTitle(title);
  renderer.showAppOptions(sqlConfig.appOptions);

  const setCustomViewOptions = (viewOptions: AllViewOptions): void => {
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
    onViewOptions: (viewOptions: AllViewOptions): void => {
      log("setGroupExpanded");
      setCustomViewOptions(viewOptions);
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
      switch (className) {
        case "closed":
        case "expanded": {
          const viewOptions = getCustomViewOptions(viewType);
          if (viewOptions.groupExpanded.includes(id)) remove(viewOptions.groupExpanded, id);
          else viewOptions.groupExpanded.push(id);
          setCustomViewOptions(viewOptions);
          showViewType(viewOptions.viewType);
          return;
        }
        case "leaf":
          // nothing to do
          return;
      }
    },
    onDetailClick: (nodeId): void => {
      // unexpected
    },
  };

  const showCustom = (): void => {
    const nodes = sqlCustom.readAll();
    const viewGraph = convertLoadedToCustom(nodes, sqlCustom.viewState.customViewOptions);
    log("renderer.showView");
    renderer.showView(viewGraph);
  };

  const showErrors = (): void => {
    const customErrors = sqlCustom.readErrors();

    const viewErrors: ViewErrors = {
      customErrors,
      viewOptions: {
        viewType: "errors",
      },
    };
    log("renderer.showView");
    renderer.showView(viewErrors);
  };

  const showViewType = (viewType?: ViewType): void => {
    if (viewType) sqlCustom.viewState.viewType = viewType;
    else viewType = sqlCustom.viewState.viewType;
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
  const self = { mainApi, window, showViewType };
  appWindows.add(self);
  return self;
};
