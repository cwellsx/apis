import { contextBridge, ipcRenderer } from "electron";
import type { AppOptions, Main2Api, Preload2Apis, Renderer2Api, ViewOptions } from "../shared-types";

const mainApiProxy: Main2Api = {
  setView2Options: (viewOptions: ViewOptions) => ipcRenderer.send("setView2Options", viewOptions),
  setAppOptions: (appOptions: AppOptions) => ipcRenderer.send("setAppOptions", appOptions),
};

const bindIpcRenderer = (rendererApi: Renderer2Api): void => {
  ipcRenderer.on("showCallStack", (event, callStack) => rendererApi.showCallStack(callStack));
  ipcRenderer.on("showAppOptions", (event, appOptions) => rendererApi.showAppOptions(appOptions));
};

const preload2Apis: Preload2Apis = {
  mainApi: mainApiProxy,
  bindIpc: bindIpcRenderer,
};

contextBridge.exposeInMainWorld("preload2Apis", preload2Apis);
