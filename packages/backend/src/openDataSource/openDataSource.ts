import type { DataSource, MainApiAsync, RuntimeContext } from "../contracts-app";
import { log, options, wrapApi } from "../utils";
import { openFromCustom } from "./openFromCustom";
import { openFromDotNet } from "./openFromDotNet";

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
    case "coreJson":
      mainApi = await openFromDotNet(dataSource, runtimeContext);
      break;

    case "customJson":
      mainApi = await openFromCustom(dataSource, runtimeContext);
      break;
  }

  // log the API
  const result: MainApiAsync = options.logApi ? wrapApi("on", mainApi) : mainApi;

  display.showAppOptions(appConfig.appOptions);

  // remember as most-recently-opened iff it opens successfully
  appConfig.dataSource = dataSource;

  return result;
};
