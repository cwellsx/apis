export type ConfigKey = "dataSource" | "cachedWhen" | "isShown";

export type DataSource = {
  path: string;
  type: "loadedAssemblies" | "customJson";
  hash: string;
};
