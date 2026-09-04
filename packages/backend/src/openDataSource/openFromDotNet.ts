import { DataSource, MainApiAsync, RuntimeContext } from "../contracts-app";
import { createMainApi } from "../viewModel";
import { createSqlCore } from "./createSqlCore";

// type GetWhen = (dataSource: DataSource) => Promise<string>;
// type GetReflected = (dataSource: DataSource) => Promise<All>;

// const createTablesFrom = async (
//   dataSource: DataSource,
//   getWhen: GetWhen,
//   getReflected: GetReflected
// ): Promise<All> => {};

// const createTablesFromDotNet = async (dataSource: DataSource): Promise<Sql.Tables> => {
//   const getWhen: GetWhen = async (dataSource: DataSource) => {
//     return dotNetApi.getWhen(dataSource.path);
//   };
//   const getReflected: GetReflected = async (dataSource: DataSource) => {
//     const json = await dotNetApi.getJson(dataSource.path);
//     return jsonParse<All>(json);
//   };
//   return await createSqlLoaded(dataSource, getWhen, getReflected);
// };

// const createTablesFromCoreJson = async (dataSource: DataSource): Promise<Sql.Tables> => {
//   const getWhen: GetWhen = async (dataSource: DataSource) => {
//     return whenFile(dataSource.path);
//   };
//   const getReflected: GetReflected = async (dataSource: DataSource) => {
//     return await readJsonT(dataSource.path, isAll);
//   };
//   return await createSqlLoaded(dataSource, getWhen, getReflected);
// };

export const openFromDotNet = async (dataSource: DataSource, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  const tables = await createSqlCore(dataSource);
  return await createMainApi(tables, runtimeContext);
};
