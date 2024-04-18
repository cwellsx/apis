import type { CallStack } from "./callStack";
import type { OnDetailClick, OnGraphClick } from "./mouseEvent";
import type { AppOptions, ViewOptions } from "./options";
import type { Types } from "./types";
import type { View } from "./view";

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

// these APIs are like the above except used for and by the second renderer window (used for showing call stacks)

export interface Main2Api {
  // not same name as MainApi
  setView2Options: (viewOptions: ViewOptions) => void;
  // same name as MainApi
  setAppOptions: (appOptions: AppOptions) => void;
}

export interface Renderer2Api {
  showCallStack: (callStack: CallStack) => void;
  showAppOptions: (appOptions: AppOptions) => void;
}

export type Bind2Ipc = (rendererApi: Renderer2Api) => void;

export type Preload2Apis = {
  mainApi: Main2Api;
  bindIpc: Bind2Ipc;
};
