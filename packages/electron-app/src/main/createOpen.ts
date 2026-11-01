import { openDataSource, pathJoin } from "backend-api";
import type { AppConfig, DataSource, ShowProgress } from "backend-app";
import { dialog, FileFilter, type BrowserWindow } from "electron";
import { appWindows } from "./appWindows";
import { createAppMenu } from "./menu";
import { showAppViews, showException, showMessage } from "./show";
import { BindDataSource, WindowContext } from "./types";

declare const CORE_EXE: string;

export const createOpen = (browserWindow: BrowserWindow, appConfig: AppConfig): BindDataSource => {
  /*
    openDataSource and bind the result as WindowContext
  */

  const bindDataSource = async (dataSource: DataSource): Promise<void> => {
    appWindows.closeAll(browserWindow);
    try {
      const showProgress: ShowProgress = (title: string | undefined, message: string) =>
        showMessage(browserWindow, title, message);

      const { presenterApi, views } = await openDataSource(dataSource, showProgress);

      // associate the API with the browser so that events are routed to this window
      const windowContext: WindowContext = { presenterApi, browserWindow, setMenuItems };
      appWindows.add(windowContext);
      // remember as most-recently-opened after it opens successfully
      appConfig.dataSource = dataSource;
      // show appOptions and views
      views.push({ type: "appOptions", payload: appConfig.appOptions });
      showAppViews(windowContext, views);
    } catch (error) {
      showException(browserWindow, error);
    }
  };

  /*
    functions called directly from the various menu items
  */

  const openAssemblies = async (): Promise<void> => {
    const paths = dialog.showOpenDialogSync(browserWindow, { properties: ["openDirectory"] });
    if (!paths) return;
    const path = paths[0];
    const dataSource: DataSource = { path, type: "loadedAssemblies" };
    await bindDataSource(dataSource);
  };

  const openJsonPath = (filters: FileFilter[], defaultPath?: string): string | undefined => {
    const paths = dialog.showOpenDialogSync(browserWindow, { properties: ["openFile"], filters, defaultPath });
    if (!paths) return;
    return paths[0];
  };

  const openCoreJson = async (): Promise<void> => {
    const path = openJsonPath([{ name: "Core", extensions: ["json"] }], pathJoin(CORE_EXE, "Core.json"));
    if (!path) return;
    const dataSource: DataSource = { path, type: "coreJson" };
    await bindDataSource(dataSource);
  };

  const openCustomJson = async (): Promise<void> => {
    const path = openJsonPath([{ name: "*", extensions: ["json"] }]);
    if (!path) return;
    const dataSource: DataSource = { path, type: "customJson" };
    await bindDataSource(dataSource);
  };

  const openRecent = async (path: string): Promise<void> => {
    const type = appConfig.recent().find((it) => it.path === path)?.type;
    if (!type) throw new Error("Unknown recent path");
    const dataSource: DataSource = { path, type };
    await bindDataSource(dataSource);
  };

  const getRecent = (): string[] => {
    const recent = appConfig.recent();
    recent.sort((x, y) => -(x.when - y.when)); // reverse chronological
    return recent.map((it) => it.path);
  };

  const setMenuItems = createAppMenu(
    browserWindow,
    openAssemblies,
    openCustomJson,
    openCoreJson,
    openRecent,
    getRecent
  );

  return bindDataSource;
};
