import type { AllViewOptions, View, ViewDetails } from "./all";
import type { OnDetailClick, OnGraphViewClick } from "./mouseEvent";
import type { AppOptions } from "./options";

/*
  The underlying APIs, which the application-specific classes wrap, are:
  - https://www.electronjs.org/docs/latest/api/ipc-main
  - https://www.electronjs.org/docs/latest/api/ipc-renderer

  Examples of how they're used:
  - https://www.electronjs.org/docs/latest/tutorial/ipc
*/

// this Api is implemented in the preload script and available to the renderer
export type MainApi = {
  onViewOptions: (viewOptions: AllViewOptions) => void;
  onAppOptions: (appOptions: AppOptions) => void;
  onGraphClick: OnGraphViewClick;
  onDetailClick: OnDetailClick;
};

// this Api is available to the main process and its functions are all void
export type RendererApi = {
  showView: (view: View) => void;
  showDetails: (details: ViewDetails) => void;
  showAppOptions: (appOptions: AppOptions) => void;
};

export type BindIpc = (rendererApi: RendererApi) => void;

export type PreloadApis = {
  mainApi: MainApi;
  bindIpc: BindIpc;
};
