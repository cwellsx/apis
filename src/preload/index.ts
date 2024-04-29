import { contextBridge, ipcRenderer } from "electron";
import type { AppOptions, MainApi, MouseEvent, PreloadApis, RendererApi, ViewOptions, ViewType } from "../shared-types";

const mainApiProxy: MainApi = {
  onViewOptions: (viewOptions: ViewOptions) => ipcRenderer.send("onViewOptions", viewOptions),
  onAppOptions: (appOptions: AppOptions) => ipcRenderer.send("onAppOptions", appOptions),
  onGraphClick: (id: string, viewType: ViewType, event: MouseEvent) =>
    ipcRenderer.send("onGraphClick", id, viewType, event),
  onDetailClick: (assemblyId: string, id: string) => ipcRenderer.send("onDetailClick", assemblyId, id),
};

const bindIpcRenderer = (rendererApi: RendererApi): void => {
  ipcRenderer.on("showGreeting", (event, greeting) => rendererApi.showGreeting(greeting));
  ipcRenderer.on("showView", (event, view) => rendererApi.showView(view));
  ipcRenderer.on("showTypes", (event, types) => rendererApi.showTypes(types));
  ipcRenderer.on("showAppOptions", (event, appOptions) => rendererApi.showAppOptions(appOptions));
};

const preloadApis: PreloadApis = {
  mainApi: mainApiProxy,
  bindIpc: bindIpcRenderer,
};

contextBridge.exposeInMainWorld("preloadApis", preloadApis);
