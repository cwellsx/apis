import type {
  AppOptions,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  MainApi,
  PreloadApis,
  RendererApi,
  View,
  ViewDetails,
  ViewOptions,
} from "backend-ui";
import { contextBridge, ipcRenderer } from "electron";

const mainApiProxy: MainApi = {
  onViewOptions: (viewOptions: ViewOptions) => ipcRenderer.send("onViewOptions", viewOptions),
  onAppOptions: (appOptions: AppOptions) => ipcRenderer.send("onAppOptions", appOptions),
  onGraphEvent: (graphEvent: GraphEvent) => ipcRenderer.send("onGraphClick", graphEvent),
  onFilterEvent: (filterEvent: FilterEvent) => ipcRenderer.send("onGraphFilter", filterEvent),
  onDetailEvent: (detailEvent: DetailEvent) => ipcRenderer.send("onDetailClick", detailEvent),
};

const bindIpcRenderer = (rendererApi: RendererApi): void => {
  ipcRenderer.on("showView", (event, view: View) => rendererApi.showView(view));
  ipcRenderer.on("showDetails", (event, details: ViewDetails) => rendererApi.showDetails(details));
  ipcRenderer.on("showAppOptions", (event, appOptions: AppOptions) => rendererApi.showAppOptions(appOptions));
};

const preloadApis: PreloadApis = {
  mainApi: mainApiProxy,
  bindIpc: bindIpcRenderer,
};

contextBridge.exposeInMainWorld("preloadApis", preloadApis);
