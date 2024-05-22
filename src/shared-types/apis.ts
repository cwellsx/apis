import type { AllViewOptions, View, ViewDetails } from "./all";
import type { GraphEvent } from "./mouseEvent";
import type { NodeId } from "./nodeId";
import type { AppOptions } from "./options";

/*
  The underlying APIs, which the application-specific classes wrap, are:
  - https://www.electronjs.org/docs/latest/api/ipc-main
  - https://www.electronjs.org/docs/latest/api/ipc-renderer

  Examples of how they're used:
  - https://www.electronjs.org/docs/latest/tutorial/ipc
*/

export type OnViewOptions = (viewOptions: AllViewOptions) => void;
export type OnAppOptions = (appOptions: AppOptions) => void;
export type OnGraphClick = (graphEvent: GraphEvent) => void;
export type OnDetailClick = (nodeId: NodeId) => void;

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
