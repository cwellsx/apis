import * as React from "react";
import type {
  AllViewOptions,
  AppOptions,
  BindIpc,
  GraphEvent,
  MainApi,
  OnDetailClick,
  OnGraphViewClick,
  PreloadApis,
  RendererApi,
  View,
  ViewDetails,
  ViewGreeting,
} from "../shared-types";
import { defaultAppOptions } from "../shared-types";
import { Details } from "./Details";
import { Graph } from "./Graph";
import { Message } from "./Message";
import { MethodDetails } from "./MethodDetails";
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
const defaultView: ViewGreeting = {
  greeting: defaultGreeting,
  viewOptions: {
    viewType: "greeting",
  },
};

// function isViewGraph(view: View): view is ViewGraph {
//   const viewTypes: ViewType[] = ["references", "methods"];
//   return viewTypes.includes(view.viewOptions.viewType);
// }
function isGreeting(view: View): view is ViewGreeting {
  return view.viewOptions.viewType === "greeting";
}

let once = false;

const App: React.FunctionComponent = () => {
  const [view, setView] = React.useState<View>(defaultView);
  const [details, setDetails] = React.useState<ViewDetails | undefined>(undefined);
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
      showView(view: View): void {
        log("showView");
        setView(view);
        if (isGreeting(view)) setDetails(undefined);
      },
      showDetails(details: ViewDetails): void {
        log("showDetails");
        setDetails(details);
      },
      showAppOptions(appOptions: AppOptions): void {
        log("showAppOptions");
        setAppOptions(appOptions);
      },
    };
    bindIpc(rendererApi);
  });

  const viewOptions = view.viewOptions;
  const viewType = viewOptions.viewType;

  const setViewOptions: (viewOptions: AllViewOptions) => void = (viewOptions) => mainApi.onViewOptions(viewOptions);
  const onAppOptions: (appOptions: AppOptions) => void = (appOptions) => mainApi.onAppOptions(appOptions);
  const onDetailClick: OnDetailClick = (assemblyId, id) => mainApi.onDetailClick(assemblyId, id);
  const onGraphClick: OnGraphViewClick = (graphEvent: GraphEvent) => mainApi.onGraphClick(graphEvent);

  const getLeft = (): JSX.Element => {
    if (isGreeting(view)) return <></>;

    const viewOptions = view.viewOptions;
    return (
      <>
        <Options viewOptions={view.viewOptions} setViewOptions={setViewOptions} />
        <Tree
          nodes={view.groups}
          leafVisible={viewOptions.leafVisible}
          groupExpanded={viewOptions.groupExpanded}
          setLeafVisible={(names) => mainApi.onViewOptions({ ...viewOptions, leafVisible: names })}
          setGroupExpanded={(names) => mainApi.onViewOptions({ ...viewOptions, groupExpanded: names })}
        />
      </>
    );
  };

  const getCenter = (): JSX.Element => {
    if (isGreeting(view)) return <Message message={view.greeting} />;

    // display a message, or an image if there is one
    if (typeof view.image === "string") return <Message message={view.image} />;

    return (
      <Graph
        imagePath={view.image.imagePath}
        areas={view.image.areas}
        now={view.image.now}
        zoomPercent={zoomPercent}
        onGraphClick={onGraphClick}
        useKeyStates={viewType == "references"}
        viewType={view.viewOptions.viewType}
      />
    );
  };

  const getRight = (): JSX.Element => {
    if (!details) return <></>;
    if (details.detailType === "types") return <Details types={details} onDetailClick={onDetailClick} />;
    return <MethodDetails methodBody={details} />;
  };

  return (
    <React.StrictMode>
      <Panes
        left={getLeft()}
        center={getCenter()}
        right={getRight()}
        fontSize={fontSize}
        onWheelZoomPercent={onWheelZoomPercent}
        onWheelFontSize={onWheelFontSize}
      />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
