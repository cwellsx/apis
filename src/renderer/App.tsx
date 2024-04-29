import * as React from "react";
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
import { defaultAppOptions } from "../shared-types";
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

const defaultGreeting = "No data";

let once = false;

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState<string | undefined>(defaultGreeting);
  const [view, setView] = React.useState<View | undefined>(undefined);
  const [types, setTypes] = React.useState<Types | undefined>(undefined);

  const [appOptions, setAppOptions] = React.useState(defaultAppOptions);

  const zoomPercent = appOptions.zoomPercent;
  const fontSize = appOptions.fontSize;
  const onWheelZoomPercent = useZoomPercent(zoomPercent, (zoomPercent: number) =>
    onAppOptions({ ...appOptions, zoomPercent })
  );
  const onWheelFontSize = useFontSize(fontSize, (fontSize: number) => onAppOptions({ ...appOptions, fontSize }));

  React.useEffect(() => {
    if (once) return;
    once = true;

    const rendererApi: RendererApi = {
      showGreeting(greeting: string): void {
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
        setAppOptions(appOptions);
      },
    };
    bindIpc(rendererApi);
  });

  if (!view)
    return (
      <React.StrictMode>
        <Panes
          left={<></>}
          center={<Message message={greeting ?? defaultGreeting} />}
          right={undefined}
          fontSize={fontSize}
          onWheelZoomPercent={onWheelZoomPercent}
          onWheelFontSize={onWheelFontSize}
        />
      </React.StrictMode>
    );

  const setViewOptions: (viewOptions: ViewOptions) => void = (viewOptions) => mainApi.onViewOptions(viewOptions);
  const onAppOptions: (appOptions: AppOptions) => void = (appOptions) => mainApi.onAppOptions(appOptions);
  const onDetailClick: OnDetailClick = (assemblyId, id) => mainApi.onDetailClick(assemblyId, id);
  const onGraphClick: OnGraphClick = (id, event) => mainApi.onGraphClick(id, view.viewOptions.viewType, event);

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
        leafVisible={view.viewOptions.leafVisible}
        groupExpanded={view.viewOptions.groupExpanded}
        setLeafVisible={(names) => mainApi.onViewOptions({ ...view.viewOptions, leafVisible: names })}
        setGroupExpanded={(names) => mainApi.onViewOptions({ ...view.viewOptions, groupExpanded: names })}
      />
    </>
  );

  const right = !types ? undefined : <Details types={types} onDetailClick={onDetailClick} />;

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
