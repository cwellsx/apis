import { contextBridge, ipcRenderer } from "electron";
import type { MainApi, PreloadApis, RendererApi } from "../shared-types";

const mainApiProxy: MainApi = {
  setLeafVisible: (names: string[]) => ipcRenderer.send("setLeafVisible", names),
  setGroupExpanded: (names: string[]) => ipcRenderer.send("setGroupExpanded", names),
  onClick: (id: string) => ipcRenderer.send("onClick", id),
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
