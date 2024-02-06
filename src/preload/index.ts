import { contextBridge, ipcRenderer } from "electron";
import type { MainApi, MouseEvent, PreloadApis, RendererApi, ViewOptions } from "../shared-types";

const mainApiProxy: MainApi = {
  setLeafVisible: (names: string[]) => ipcRenderer.send("setLeafVisible", names),
  setGroupExpanded: (names: string[]) => ipcRenderer.send("setGroupExpanded", names),
  setViewOptions: (viewOptions: ViewOptions) => ipcRenderer.send("setViewOptions", viewOptions),
  onClick: (id: string, event: MouseEvent) => ipcRenderer.send("onClick", id, event),
};

const bindIpcRenderer = (rendererApi: RendererApi): void => {
  ipcRenderer.on("setGreeting", (event, greeting) => rendererApi.setGreeting(greeting));
  ipcRenderer.on("showView", (event, view) => rendererApi.showView(view));
  ipcRenderer.on("showTypes", (event, types) => rendererApi.showTypes(types));
};

const preloadApis: PreloadApis = {
  mainApi: mainApiProxy,
  bindIpc: bindIpcRenderer,
};

contextBridge.exposeInMainWorld("preloadApis", preloadApis);
