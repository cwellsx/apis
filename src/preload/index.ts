import { contextBridge, ipcRenderer } from "electron";
import type {
  AllViewOptions,
  AppOptions,
  GraphEvent,
  MainApi,
  NodeId,
  PreloadApis,
  RendererApi,
} from "../shared-types";

const mainApiProxy: MainApi = {
  onViewOptions: (viewOptions: AllViewOptions) => ipcRenderer.send("onViewOptions", viewOptions),
  onAppOptions: (appOptions: AppOptions) => ipcRenderer.send("onAppOptions", appOptions),
  onGraphClick: (graphEvent: GraphEvent) => ipcRenderer.send("onGraphClick", graphEvent),
  onDetailClick: (nodeId: NodeId) => ipcRenderer.send("onDetailClick", nodeId),
};

const bindIpcRenderer = (rendererApi: RendererApi): void => {
  ipcRenderer.on("showView", (event, view) => rendererApi.showView(view));
  ipcRenderer.on("showDetails", (event, details) => rendererApi.showDetails(details));
  ipcRenderer.on("showAppOptions", (event, appOptions) => rendererApi.showAppOptions(appOptions));
};

const preloadApis: PreloadApis = {
  mainApi: mainApiProxy,
  bindIpc: bindIpcRenderer,
};

contextBridge.exposeInMainWorld("preloadApis", preloadApis);
