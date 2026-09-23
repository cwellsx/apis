import type { AppOptions } from "./appOptions";
import type { DetailEvent, FilterEvent, GraphEvent } from "./events";
import * as GraphOptions from "./graphOptions";
import type { View } from "./view";
import type { ViewDetails } from "./viewDetails";

/*
  The underlying APIs, which the application-specific classes wrap, are:
  - https://www.electronjs.org/docs/latest/api/ipc-main
  - https://www.electronjs.org/docs/latest/api/ipc-renderer

  Examples of how they're used:
  - https://www.electronjs.org/docs/latest/tutorial/ipc
*/

type OnUserEvent<T> = (event: T) => void;

export type OnViewOptions = OnUserEvent<GraphOptions.Any>;
export type OnAppOptions = OnUserEvent<AppOptions>;
export type OnGraphEvent = OnUserEvent<GraphEvent>;
export type OnFilterEvent = OnUserEvent<FilterEvent>;
export type OnDetailEvent = OnUserEvent<DetailEvent>;

// this Api is implemented in the preload script and available to the renderer
export type MainApi = {
  onViewOptions: OnViewOptions;
  onAppOptions: OnAppOptions;
  onGraphEvent: OnGraphEvent;
  onFilterEvent: OnFilterEvent;
  onDetailEvent: OnDetailEvent;
};

// this Api is available to the main process and its functions are all void
export type RendererApi = {
  showView: (view: View) => void;
  showDetails: (details: ViewDetails) => void;
  showAppOptions: (appOptions: AppOptions) => void;
};

export type PreloadApis = { mainApi: MainApi; bindIpc: (rendererApi: RendererApi) => void };
