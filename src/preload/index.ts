import { contextBridge, ipcRenderer } from "electron";
import type { AppOptions, MainApi, MouseEvent, PreloadApis, RendererApi, ViewOptions, ViewType } from "../shared-types";

const mainApiProxy: MainApi = {
  setViewOptions: (viewOptions: ViewOptions) => ipcRenderer.send("setViewOptions", viewOptions),
  setAppOptions: (appOptions: AppOptions) => ipcRenderer.send("setAppOptions", appOptions),
  onGraphClick: (id: string, viewType: ViewType, event: MouseEvent) =>
    ipcRenderer.send("onGraphClick", id, viewType, event),
  onDetailClick: (assemblyId: string, id: string) => ipcRenderer.send("onDetailClick", assemblyId, id),
};

const bindIpcRenderer = (rendererApi: RendererApi): void => {
  ipcRenderer.on("setGreeting", (event, greeting) => rendererApi.setGreeting(greeting));
  ipcRenderer.on("showView", (event, view) => rendererApi.showView(view));
  ipcRenderer.on("showTypes", (event, types) => rendererApi.showTypes(types));
  ipcRenderer.on("showAppOptions", (event, appOptions) => rendererApi.showAppOptions(appOptions));
};

const preloadApis: PreloadApis = {
  mainApi: mainApiProxy,
  bindIpc: bindIpcRenderer,
};

contextBridge.exposeInMainWorld("preloadApis", preloadApis);
