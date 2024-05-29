import { contextBridge, ipcRenderer } from "electron";
import type {
  AppOptions,
  DetailEvent,
  GraphEvent,
  MainApi,
  PreloadApis,
  RendererApi,
  ViewOptions,
} from "../shared-types";

const mainApiProxy: MainApi = {
  onViewOptions: (viewOptions: ViewOptions) => ipcRenderer.send("onViewOptions", viewOptions),
  onAppOptions: (appOptions: AppOptions) => ipcRenderer.send("onAppOptions", appOptions),
  onGraphClick: (graphEvent: GraphEvent) => ipcRenderer.send("onGraphClick", graphEvent),
  onDetailClick: (detailEvent: DetailEvent) => ipcRenderer.send("onDetailClick", detailEvent),
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
