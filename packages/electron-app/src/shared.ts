import { AnyEvent, AnyView } from "backend-ui";

export const IPC_CHANNELS = { show: "show", onEvents: "onEvents" } as const;
export const PRELOAD_API_KEY = "preloadApis";

export type MainApi = { onEvent: (events: AnyEvent[]) => void };

export type RendererApi = { show: (views: AnyView[]) => void };

export type PreloadApis = { mainApi: MainApi; bindIpc: (rendererApi: RendererApi) => void };
