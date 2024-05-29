import type { AppOptions } from "./appOptions";
import type { DetailEvent, GraphEvent } from "./events";
import type { ViewDetails } from "./viewDetails";
import type { ViewOptions } from "./viewOptions";
import type { View } from "./views";

/*
  The underlying APIs, which the application-specific classes wrap, are:
  - https://www.electronjs.org/docs/latest/api/ipc-main
  - https://www.electronjs.org/docs/latest/api/ipc-renderer

  Examples of how they're used:
  - https://www.electronjs.org/docs/latest/tutorial/ipc
*/

export type OnViewOptions = (viewOptions: ViewOptions) => void;
export type OnAppOptions = (appOptions: AppOptions) => void;
export type OnGraphClick = (graphEvent: GraphEvent) => void;
export type OnDetailClick = (detailEvent: DetailEvent) => void;

// this Api is implemented in the preload script and available to the renderer
export type MainApi = {
  onViewOptions: OnViewOptions;
  onAppOptions: OnAppOptions;
  onGraphClick: OnGraphClick;
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
