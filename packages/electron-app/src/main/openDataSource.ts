import { DotNetApi } from "backend/createDotNetApi";
import { DisplayApi, MainApi } from "../shared-types";
import { createAppWindow } from "./createAppWindow";
import { createCustomWindow } from "./createCustomWindow";
import type { CustomNode } from "./customJson";
import { fixCustomJson, isCustomJson } from "./customJson";
import { getAppFilename, readJsonT, whenFile, writeFileSync } from "./fs";
import type { Reflected } from "./loaded";
import { isReflected } from "./loaded";
import { log } from "./log";
import { SetViewMenu } from "./menu";
import { options } from "./shared-types";
import { createSqlCustom, createSqlLoaded, SqlConfig, SqlCustom, SqlLoaded, type DataSource } from "./sql";

// not yet the DataSource SQL
let sqlLoaded: SqlLoaded | undefined;
let sqlCustom: SqlCustom | undefined;

const closeAll = (): void => {
  if (sqlLoaded) {
    sqlLoaded.close();
    sqlLoaded = undefined;
  }
  if (sqlCustom) {
    sqlCustom.close();
    sqlCustom = undefined;
  }
};

const changeSqlLoaded = (dataSource: DataSource): SqlLoaded => {
  log("changeSqlLoaded");
  closeAll();
  return createSqlLoaded(dataSource);
};

const changeSqlCustom = (dataSource: DataSource): SqlCustom => {
  log("changeSqlCustom");
  closeAll();
  return createSqlCustom(dataSource);
};

/*
  openDataSource to open any and all types of DataSource
*/

export const openDataSource = async (
  dataSource: DataSource,
  display: DisplayApi,
  dotNetApi: DotNetApi,
  setViewMenu: SetViewMenu,
  sqlConfig: SqlConfig
): Promise<MainApi | undefined> => {
  const openSqlLoaded = async (when: string, getReflected: (path: string) => Promise<Reflected>): Promise<MainApi> => {
    sqlLoaded = changeSqlLoaded(dataSource);
    if (options.alwaysReload || sqlLoaded.shouldReload(when)) {
      log("getLoaded");
      const reflected = await getReflected(dataSource.path);
      // save Reflected
      const jsonPath = getAppFilename(`Reflected.${dataSource.hash}.json`);
      log(`writeFileSync(${jsonPath})`);
      writeFileSync(jsonPath, JSON.stringify(reflected, null, " "));
      sqlLoaded.save(reflected, when, dataSource.hash);
    } else log("!getLoaded");
    return createAppWindow(display, sqlLoaded, sqlConfig, dataSource.path, setViewMenu, {
      kind: "openViewType",
    });
  };

  const openSqlCustom = async (when: string, getCustom: (path: string) => Promise<CustomNode[]>): Promise<MainApi> => {
    sqlCustom = changeSqlCustom(dataSource);
    if (options.alwaysReload || sqlCustom.shouldReload(when)) {
      const nodes = await getCustom(dataSource.path);
      const errors = fixCustomJson(nodes);
      sqlCustom.save(nodes, errors, when);
    }
    return createCustomWindow(display, sqlCustom, sqlConfig, dataSource.path, setViewMenu);
  };

  const readDotNetApi = async (path: string): Promise<Reflected> => {
    const json = await dotNetApi.getJson(path);
    const reflected = JSON.parse(json);
    return reflected;
  };

  const readCoreJson = async (path: string): Promise<Reflected> => await readJsonT(path, isReflected);

  const readCustomJson = async (path: string): Promise<CustomNode[]> => await readJsonT(path, isCustomJson);

  /*
      statements wrapped in a try/catch handler
    */

  try {
    log("openDataSource");
    const path = dataSource.path;
    display.showMessage(`Loading ${path}`, "Loading...");
    let result: MainApi;
    switch (dataSource.type) {
      case "loadedAssemblies":
        result = await openSqlLoaded(await dotNetApi.getWhen(dataSource.path), readDotNetApi);
        break;
      case "coreJson":
        result = await openSqlLoaded(await whenFile(dataSource.path), readCoreJson);
        break;
      case "customJson":
        result = await openSqlCustom(await whenFile(dataSource.path), readCustomJson);
        break;
    }
    // remember as most-recently-opened iff it opens successfully
    sqlConfig.dataSource = dataSource;
    return result;
  } catch (error: unknown | Error) {
    display.showException(error);
    return undefined;
  }
};
