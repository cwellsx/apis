import type { DataSource, MainApiAsync, RuntimeContext } from "../contracts-app";
import { log, options, wrapApi } from "../utils";
import { openCustomJson } from "./openFromCustomJson";
import { openFromDotNet } from "./openFromDotNet";
import { openFromCoreJson } from "./openFromLegacy";

/*
  openDataSource to open any and all types of DataSource
*/

export const openDataSource = async (dataSource: DataSource, runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  // log the API
  if (options.logApi) runtimeContext.display = wrapApi("send", runtimeContext.display);
  const { appConfig, display } = runtimeContext;

  log("openDataSource");
  const path = dataSource.path;
  display.showLoadingMessage(`Loading ${path}`, "Loading...");
  log(`openDataSource: ${path}`);

  let mainApi: MainApiAsync;
  switch (dataSource.type) {
    case "loadedAssemblies":
      mainApi = await openFromDotNet(dataSource, runtimeContext);
      break;

    case "coreJson":
      mainApi = await openFromCoreJson(dataSource, runtimeContext);
      break;

    case "customJson":
      mainApi = await openCustomJson(dataSource, runtimeContext);
      break;
  }

  // log the API
  const result: MainApiAsync = options.logApi ? wrapApi("on", mainApi) : mainApi;

  display.showAppOptions(appConfig.appOptions);

  // remember as most-recently-opened iff it opens successfully
  appConfig.dataSource = dataSource;

  return result;
};
