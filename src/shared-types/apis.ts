import type { OnDetailClick, OnGraphClick } from "./mouseEvent";
import type { Types } from "./types";
import type { AppOptions, View, ViewOptions } from "./view";

/*
  The underlying APIs, which the application-specific classes wrap, are:
  - https://www.electronjs.org/docs/latest/api/ipc-main
  - https://www.electronjs.org/docs/latest/api/ipc-renderer

  Examples of how they're used:
  - https://www.electronjs.org/docs/latest/tutorial/ipc
*/

// this Api is implemented in the preload script and available to the renderer
export interface MainApi {
  setLeafVisible: (names: string[]) => void;
  setGroupExpanded: (names: string[]) => void;
  setViewOptions: (viewOptions: ViewOptions) => void;
  setAppOptions: (appOptions: AppOptions) => void;
  onGraphClick: OnGraphClick;
  onDetailClick: OnDetailClick;
}

// this Api is available to the main process and its functions are all void
export interface RendererApi {
  setGreeting: (greeting: string) => void;
  showView: (view: View) => void;
  showTypes: (types: Types) => void;
  showAppOptions: (appOptions: AppOptions) => void;
}

export type BindIpc = (rendererApi: RendererApi) => void;

export type PreloadApis = {
  mainApi: MainApi;
  bindIpc: BindIpc;
};
