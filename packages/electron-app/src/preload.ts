import type { AnyEvent, AnyView } from "backend-ui";
import { contextBridge, ipcRenderer } from "electron";
import type { MainApi, PreloadApis, RendererApi } from "./shared";
import { IPC_CHANNELS, PRELOAD_API_KEY } from "./shared";

const mainApi: MainApi = { onEvent: (events: AnyEvent[]): void => ipcRenderer.send(IPC_CHANNELS.onEvents, events) };

const bindIpc = (rendererApi: RendererApi): void => {
  ipcRenderer.on(IPC_CHANNELS.show, (event, views: AnyView[]) => rendererApi.show(views));
};

const preloadApis: PreloadApis = { mainApi, bindIpc };

contextBridge.exposeInMainWorld(PRELOAD_API_KEY, preloadApis);
