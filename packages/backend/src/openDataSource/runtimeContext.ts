import type { AppConfig, DataSource, DisplayApi, SetMenuItems } from "../contracts-app";

export type RuntimeContext = {
  dataSource: DataSource;
  display: DisplayApi;
  setMenuItems: SetMenuItems;
  appConfig: AppConfig;
};
