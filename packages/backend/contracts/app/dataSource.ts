export type DataSourceType = "loadedAssemblies" | "customJson" | "coreJson";

export type DataSource = { path: string; type: DataSourceType };
