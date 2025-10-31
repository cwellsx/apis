import type { AppOptions } from "./appOptions";
import type { DetailEvent, FilterEvent, GraphEvent } from "./events";
import type { View } from "./view";
import type { ViewDetails } from "./viewDetails";
import type { ViewOptions } from "./viewOptions";

/*
  The underlying APIs, which the application-specific classes wrap, are:
  - https://www.electronjs.org/docs/latest/api/ipc-main
  - https://www.electronjs.org/docs/latest/api/ipc-renderer

  Examples of how they're used:
  - https://www.electronjs.org/docs/latest/tutorial/ipc
*/

export type OnUserEvent<T> = (event: T) => void;
type OnUserEventAsync<T> = (event: T) => Promise<void>;

// this Api is implemented in the preload script and available to the renderer
export type MainApi = {
  onViewOptions: OnUserEvent<ViewOptions>;
  onAppOptions: OnUserEvent<AppOptions>;
  onGraphEvent: OnUserEvent<GraphEvent>;
  onFilterEvent: OnUserEvent<FilterEvent>;
  onDetailEvent: OnUserEvent<DetailEvent>;
};

// this Api is implemented in the backend
// SQLite method as quick and synchronous,
// but rendering the Graph in graphViz.ts is slow and asynchronous
export type MainApiAsync = {
  onViewOptions: OnUserEventAsync<ViewOptions>;
  onAppOptions: OnUserEvent<AppOptions>;
  onGraphEvent: OnUserEventAsync<GraphEvent>;
  onFilterEvent: OnUserEventAsync<FilterEvent>;
  onDetailEvent: OnUserEventAsync<DetailEvent>;
  // MainApiAsync is implemented and returned by createAppWindow which contains a DisplayApi
  // so this method can be used by the caller if any methods throw an error
  showException: (error: unknown) => void;
};

// this Api is available to the main process and its functions are all void
export type RendererApi = {
  showView: (view: View) => void;
  showDetails: (details: ViewDetails) => void;
  showAppOptions: (appOptions: AppOptions) => void;
};

// this extends RendererApi without additional preloaded IPC methods
export type DisplayApi = RendererApi & {
  showException: (error: unknown) => void;
  showMessage: (title: string | undefined, message: string) => void;
  setTitle: (title: string) => void;
};

export type PreloadApis = {
  mainApi: MainApi;
  bindIpc: (rendererApi: RendererApi) => void;
};
