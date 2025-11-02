import { AppOptions } from "../ui";

export type DataSourceType = "loadedAssemblies" | "customJson" | "coreJson";

export type DataSource = {
  path: string;
  type: DataSourceType;
};

export type RecentColumns = {
  path: string;
  type: DataSourceType;
  when: number;
};

// types.ts (or above class)
export type AppConfig = {
  recent(): RecentColumns[];
  dataSource?: DataSource;
  appOptions: AppOptions;
  close(): void;
};
