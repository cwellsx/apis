import * as React from "react";
import { Graph } from "../renderer.shared/Graph";
import { Message } from "../renderer.shared/Message";
import { Panes } from "../renderer.shared/Panes";
import { log } from "../renderer.shared/log";
import { useFontSize, useZoomPercent } from "../renderer.shared/useZoomPercent";
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
import { Options } from "./Options";
import { Tree } from "./Tree";

declare global {
  export interface Window {
    preloadApis: PreloadApis;
  }
}

export const mainApi: MainApi = window.preloadApis.mainApi;
export const bindIpc: BindIpc = window.preloadApis.bindIpc;

const defaultView: View = {
  image: "",
  groups: [],
  leafVisible: [],
  groupExpanded: [],
  viewOptions: defaultViewOptions,
};
const defaultTypes: Types = { assemblyId: "", namespaces: [], exceptions: [] };

let once = false;

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState<string | undefined>("No data");
  const [view, setView] = React.useState(defaultView);
  const [types, setTypes] = React.useState(defaultTypes);

  const [appOptions, setAppOptions_] = React.useState(defaultAppOptions);
  const sendAppOptions = (newOptions: Partial<AppOptions>): void => setAppOptions({ ...appOptions, ...newOptions });
  const zoomPercent = appOptions.zoomPercent;
  const fontSize = appOptions.fontSize;
  const onWheelZoomPercent = useZoomPercent(zoomPercent, (zoomPercent: number) => sendAppOptions({ zoomPercent }));
  const onWheelFontSize = useFontSize(fontSize, (fontSize: number) => sendAppOptions({ fontSize }));

  React.useEffect(() => {
    if (once) return;
    once = true;

    const rendererApi: RendererApi = {
      // tslint:disable-next-line:no-shadowed-variable
      setGreeting(greeting: string): void {
        setGreeting(greeting);
      },
      showView(view: View): void {
        log("showView");
        setGreeting(undefined);
        setView(view);
      },
      showTypes(types: Types): void {
        log("showTypes");
        setGreeting(undefined);
        setTypes(types);
      },
      showAppOptions(appOptions: AppOptions): void {
        log("showAppOptions");
        setAppOptions_(appOptions);
      },
    };
    bindIpc(rendererApi);
  });

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
};

export const createApp = () => <App />;
