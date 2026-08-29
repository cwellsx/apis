import type { MainApiAsync } from "../contracts-app";
import { log, options, wrapApi } from "../utils";
import { openCustomJson } from "./openFromCustomJson";
import { openFromCoreJson, openFromDotNet } from "./openFromLegacy";
import { RuntimeContext } from "./runtimeContext";

/*
  openDataSource to open any and all types of DataSource
*/

export const openDataSource = async (runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  // log the API
  if (options.logApi) runtimeContext.display = wrapApi("send", runtimeContext.display);
  const { dataSource, appConfig, display } = runtimeContext;

  log("openDataSource");
  const path = runtimeContext.dataSource.path;
  display.showLoadingMessage(`Loading ${path}`, "Loading...");
  log(`openDataSource: ${path}`);

  let mainApi: MainApiAsync;
  switch (dataSource.type) {
    case "loadedAssemblies":
      mainApi = await openFromDotNet(runtimeContext);
      break;

    case "coreJson":
      mainApi = await openFromCoreJson(runtimeContext);
      break;

    case "customJson":
      mainApi = await openCustomJson(runtimeContext);
      break;
  }

  // log the API
  const result: MainApiAsync = options.logApi ? wrapApi("on", mainApi) : mainApi;

  display.showAppOptions(appConfig.appOptions);

  // remember as most-recently-opened iff it opens successfully
  appConfig.dataSource = dataSource;

  return result;
};
