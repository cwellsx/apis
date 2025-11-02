import { createSqlDatabase } from "sqlio";
import type { AppConfig, DataSource } from "../contracts-app";
import type { Reflected } from "../contracts-dotnet";
import { isReflected } from "../contracts-dotnet";
import { DotNetApi } from "../createDotNetApi";
import { fixCustomJson, isCustomJson } from "../customJson";
import { getAppFilename, jsonParse, log, options, pathJoin, readJsonT, whenFile, writeFileSync } from "../utils";
import { hash } from "./hash";
import { SqlConfig } from "./sqlConfig";
import { SqlCustom } from "./sqlCustom";
import { SqlLoaded } from "./sqlLoaded";

const nativeBinding = pathJoin(process.cwd(), ".webpack\\main\\native_modules\\build\\Release\\better_sqlite3.node");

type Opened = {
  close: () => void;
};
let opened: Opened | undefined;

const closeOpened = (): void => {
  if (opened) {
    opened.close();
    opened = undefined;
  }
};

type GetWhen = (dataSource: DataSource) => Promise<string>;
type GetReflected = (dataSource: DataSource) => Promise<Reflected>;

const createSqlLoaded = async (
  dataSource: DataSource,
  getWhen: GetWhen,
  getReflected: GetReflected
): Promise<SqlLoaded> => {
  closeOpened();

  const hashValue = hash(dataSource.path);
  const filename = getAppFilename(`${dataSource.type}-${hashValue}.db`);

  log(`createSqlDatabase(${filename})`);
  const sqlLoaded = new SqlLoaded(createSqlDatabase(filename, nativeBinding));

  const when = await getWhen(dataSource);

  if (options.alwaysReload || sqlLoaded.shouldReload(when)) {
    log("getReflected: " + dataSource.path);
    const reflected = await getReflected(dataSource);

    const jsonPath = getAppFilename(`Reflected.${hashValue}.json`);
    log(`writeFileSync(${jsonPath})`);
    writeFileSync(jsonPath, JSON.stringify(reflected, null, " "));

    sqlLoaded.save(reflected, when);
  }

  opened = sqlLoaded;
  return sqlLoaded;
};

export const createSqlLoadedFromDotNet = async (dataSource: DataSource, dotNetApi: DotNetApi): Promise<SqlLoaded> => {
  const getWhen: GetWhen = async (dataSource: DataSource) => {
    return dotNetApi.getWhen(dataSource.path);
  };
  const getReflected: GetReflected = async (dataSource: DataSource) => {
    const json = await dotNetApi.getJson(dataSource.path);
    return jsonParse<Reflected>(json);
  };
  return await createSqlLoaded(dataSource, getWhen, getReflected);
};

export const createSqlLoadedFromCoreJson = async (dataSource: DataSource): Promise<SqlLoaded> => {
  const getWhen: GetWhen = async (dataSource: DataSource) => {
    return whenFile(dataSource.path);
  };
  const getReflected: GetReflected = async (dataSource: DataSource) => {
    return await readJsonT(dataSource.path, isReflected);
  };
  return await createSqlLoaded(dataSource, getWhen, getReflected);
};

export const createSqlCustomFromJson = async (dataSource: DataSource): Promise<SqlCustom> => {
  closeOpened();

  const hashValue = hash(dataSource.path);
  const filename = getAppFilename(`${dataSource.type}-${hashValue}.db`);

  log("createSqlCustom: " + filename);
  const sqlCustom = new SqlCustom(createSqlDatabase(filename, nativeBinding));

  const when = await whenFile(dataSource.path);

  if (options.alwaysReload || sqlCustom.shouldReload(when)) {
    const nodes = await readJsonT(dataSource.path, isCustomJson);
    const errors = fixCustomJson(nodes);
    sqlCustom.save(nodes, errors, when);
  }

  opened = sqlCustom;
  return sqlCustom;
};

export function createSqlConfig(filename: string): AppConfig {
  filename = getAppFilename(filename);
  log("createSqlConfig: " + filename);
  return new SqlConfig(createSqlDatabase(filename, nativeBinding));
}
