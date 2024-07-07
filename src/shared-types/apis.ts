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

// TODO redeclare these as a single generic type
export type OnViewOptions = (viewOptions: ViewOptions) => void;
export type OnAppOptions = (appOptions: AppOptions) => void;
export type OnGraphClick = (graphEvent: GraphEvent) => void;
export type OnGraphFilter = (filterEvent: FilterEvent) => void;
export type OnDetailClick = (detailEvent: DetailEvent) => void;

// this Api is implemented in the preload script and available to the renderer
export type MainApi = {
  onViewOptions: OnViewOptions;
  onAppOptions: OnAppOptions;
  onGraphClick: OnGraphClick;
  onGraphFilter: OnGraphFilter;
  onDetailClick: OnDetailClick;
};

// this Api is available to the main process and its functions are all void
export type RendererApi = {
  showView: (view: View) => void;
  showDetails: (details: ViewDetails) => void;
  showAppOptions: (appOptions: AppOptions) => void;
};

export type PreloadApis = {
  mainApi: MainApi;
  bindIpc: (rendererApi: RendererApi) => void;
};
