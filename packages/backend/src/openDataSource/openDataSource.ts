import type { MainApiAsync } from "../contracts-app";
import { ShowBase } from "../output";
import { log, options, wrapApi } from "../utils";
import { openCustomJson } from "./openFromCustomJson";
import { openFromCoreJson, openFromDotNet } from "./openFromLegacy";
import { RuntimeContext } from "./runtimeContext";

/*
  openDataSource to open any and all types of DataSource
*/

export const openDataSource = async (runtimeContext: RuntimeContext): Promise<MainApiAsync> => {
  type Tuple = [MainApiAsync, ShowBase];

  const { dataSource, appConfig } = runtimeContext;
  // log the API
  if (options.logApi) runtimeContext.display = wrapApi("send", runtimeContext.display);

  log("openDataSource");
  const path = runtimeContext.dataSource.path;
  runtimeContext.display.showLoadingMessage(`Loading ${path}`, "Loading...");
  log(`openDataSource: ${path}`);

  let tuple: Tuple;
  switch (dataSource.type) {
    case "loadedAssemblies":
      tuple = await openFromDotNet(runtimeContext);
      break;

    case "coreJson":
      tuple = await openFromCoreJson(runtimeContext);
      break;

    case "customJson":
      tuple = await openCustomJson(runtimeContext);
      break;
  }

  const [mainApi, show] = tuple;

  // log the API
  const result: MainApiAsync = options.logApi ? wrapApi("on", mainApi) : mainApi;

  await show.showAppOptions(appConfig.appOptions);

  // remember as most-recently-opened iff it opens successfully
  appConfig.dataSource = dataSource;

  return result;
};
