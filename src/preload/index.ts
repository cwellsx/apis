import { contextBridge, ipcRenderer } from "electron";
import type { AppOptions, GraphEvent, MainApi, PreloadApis, RendererApi, ViewOptions } from "../shared-types";

const mainApiProxy: MainApi = {
  onViewOptions: (viewOptions: ViewOptions) => ipcRenderer.send("onViewOptions", viewOptions),
  onAppOptions: (appOptions: AppOptions) => ipcRenderer.send("onAppOptions", appOptions),
  onGraphClick: (graphEvent: GraphEvent) => ipcRenderer.send("onGraphClick", graphEvent),
  onDetailClick: (assemblyId: string, id: string) => ipcRenderer.send("onDetailClick", assemblyId, id),
};

const bindIpcRenderer = (rendererApi: RendererApi): void => {
  ipcRenderer.on("showGreeting", (event, greeting) => rendererApi.showGreeting(greeting));
  ipcRenderer.on("showView", (event, view) => rendererApi.showView(view));
  ipcRenderer.on("showTypes", (event, types) => rendererApi.showTypes(types));
  ipcRenderer.on("showMethodBody", (event, methodBody) => rendererApi.showMethodBody(methodBody));
  ipcRenderer.on("showAppOptions", (event, appOptions) => rendererApi.showAppOptions(appOptions));
};

const preloadApis: PreloadApis = {
  mainApi: mainApiProxy,
  bindIpc: bindIpcRenderer,
};

contextBridge.exposeInMainWorld("preloadApis", preloadApis);
