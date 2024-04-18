import * as React from "react";
/*
import type {
  AppOptions,
  BindIpc,
  MainApi,
  OnDetailClick,
  OnGraphClick,
  PreloadApis,
  RendererApi,
  Types,
  View,
  ViewOptions,
} from "../shared-types";
import { defaultAppOptions, defaultViewOptions } from "../shared-types";
import { Details } from "./Details";
import { Graph } from "./Graph";
import { Message } from "./Message";
import { Options } from "./Options";
import { Panes } from "./Panes";
import { Tree } from "./Tree";
import { log } from "./log";
import { useFontSize, useZoomPercent } from "./useZoomPercent";

declare global {
  export interface Window {
    preloadApis: PreloadApis;
  }
}

export const mainApi: MainApi = window.preloadApis.mainApi;
export const bindIpc: BindIpc = window.preloadApis.bindIpc;
*/
import type { AppOptions, Bind2Ipc, CallStack, Main2Api, Preload2Apis, Renderer2Api } from "../shared-types";
import { defaultAppOptions } from "../shared-types";
import { log } from "./log";

declare global {
  export interface Window {
    preload2Apis: Preload2Apis;
  }
}
const mainApi: Main2Api = window.preload2Apis.mainApi;
const bindIpc: Bind2Ipc = window.preload2Apis.bindIpc;
/*
const defaultView: View = {
  image: "",
  groups: [],
  leafVisible: [],
  groupExpanded: [],
  viewOptions: defaultViewOptions,
};
const defaultTypes: Types = { assemblyId: "", namespaces: [], exceptions: [] };
*/
let once = false;
const defaultCallstack: CallStack = { image: "", asText: {} };

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState<string | undefined>("Hello World?");
  const [callStack, setCallStack] = React.useState(defaultCallstack);

  const [appOptions, setAppOptions_] = React.useState(defaultAppOptions);
  /*
  const [greeting, setGreeting] = React.useState<string | undefined>("No data");
  const [view, setView] = React.useState(defaultView);
  const [types, setTypes] = React.useState(defaultTypes);

  const [appOptions, setAppOptions_] = React.useState(defaultAppOptions);
  const sendAppOptions = (newOptions: Partial<AppOptions>): void => setAppOptions({ ...appOptions, ...newOptions });
  const zoomPercent = appOptions.zoomPercent;
  const fontSize = appOptions.fontSize;
  const onWheelZoomPercent = useZoomPercent(zoomPercent, (zoomPercent: number) => sendAppOptions({ zoomPercent }));
  const onWheelFontSize = useFontSize(fontSize, (fontSize: number) => sendAppOptions({ fontSize }));
*/

  React.useEffect(() => {
    if (once) return;
    once = true;
    const renderer2Api: Renderer2Api = {
      showCallStack: (callStack: CallStack): void => {
        log("showCallStack");
        setCallStack(callStack);
      },
      showAppOptions(appOptions: AppOptions): void {
        log("showAppOptions");
        setGreeting("Hello World!");
        setAppOptions_(appOptions);
      },
    };
    bindIpc(renderer2Api);
  });

  /*
  const setLeafVisible: (names: string[]) => void = (names) => mainApi.setLeafVisible(names);
  const setGroupExpanded: (names: string[]) => void = (names) => mainApi.setGroupExpanded(names);
  const setViewOptions: (viewOptions: ViewOptions) => void = (viewOptions) => mainApi.setViewOptions(viewOptions);
  const setAppOptions: (appOptions: AppOptions) => void = (appOptions) => mainApi.setAppOptions(appOptions);
  const onDetailClick: OnDetailClick = (assemblyId, id) => mainApi.onDetailClick(assemblyId, id);
  const onGraphClick: OnGraphClick = (id, event) => mainApi.onGraphClick(id, event);

  // display a message, or an image if there is one
  const center = greeting ? (
    <Message message={greeting} />
  ) : typeof view.image === "string" ? (
    <Message message={view.image} />
  ) : (
    <Graph
      imagePath={view.image.imagePath}
      areas={view.image.areas}
      now={view.image.now}
      zoomPercent={zoomPercent}
      onGraphClick={onGraphClick}
    />
  );

  const left = (
    <>
      <Options viewOptions={view.viewOptions} setViewOptions={setViewOptions} />
      <Tree
        nodes={view.groups}
        leafVisible={view.leafVisible}
        groupExpanded={view.groupExpanded}
        setLeafVisible={setLeafVisible}
        setGroupExpanded={setGroupExpanded}
      />
    </>
  );

  const right = !types.namespaces.length ? undefined : <Details types={types} onDetailClick={onDetailClick} />;

  return (
    <React.StrictMode>
      <Panes
        left={left}
        center={center}
        right={right}
        fontSize={fontSize}
        onWheelZoomPercent={onWheelZoomPercent}
        onWheelFontSize={onWheelFontSize}
      />
    </React.StrictMode>
  );
*/
  return <>{greeting}</>;
};

// const App: React.FunctionComponent = () => {
// };

export const createApp = () => <App />;
