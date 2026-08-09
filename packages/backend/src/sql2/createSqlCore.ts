import { createSqlDatabase } from "sqlio";
import type { All } from "../../contracts/dotnet2";
import { isAll } from "../../contracts/dotnet2";
import { DataSource } from "../contracts-app";
import * as dotNetApi from "../dotNetApi";
import { assert, getAppFilename, getSqlNodePath, jsonParse, log, readJsonT, whenFile } from "../utils";
import { hash } from "./hash";
import { insertAll } from "./insertAll";
import { createTables, Tables } from "./schema";

type GetAll = (dataSource: DataSource) => Promise<All>;

const getAllFromCoreExe = async (dataSource: DataSource) => {
  const json = await dotNetApi.getJson(dataSource.path);
  return jsonParse<All>(json);
};

const getAllFromCoreJson = async (dataSource: DataSource) => await readJsonT(dataSource.path, isAll);

const onType = async (dataSource: DataSource): Promise<{ when: string; getAll: GetAll }> => {
  switch (dataSource.type) {
    case "loadedAssemblies":
      return { when: await dotNetApi.getWhen(dataSource.path), getAll: getAllFromCoreExe };
    case "coreJson":
      return { when: await whenFile(dataSource.path), getAll: getAllFromCoreJson };
    default:
      throw new Error(`Unexpected dataSource.type: {dataSource.type}`);
  }
};

export const createSqlCore = async (dataSource: DataSource): Promise<{ all: All; tables: Tables }> => {
  const { when, getAll } = await onType(dataSource);

  const filename = getAppFilename(`${dataSource.type}-${hash(dataSource.path)}.db`);
  log(`db filename: ${filename}`);

  const all = await getAll(dataSource);
  assert(Object.keys(all.assemblies).length != 0);

  const db = createSqlDatabase(filename, getSqlNodePath());
  const tables = createTables(db);
  if (when != tables.config.getWhen()) {
    insertAll(all, tables);
    tables.config.setWhen(when);
  }
  return { all, tables };
};
