import * as React from "react";
import type {
  AppOptions,
  OnAppOptions,
  OnDetailClick,
  OnGraphClick,
  OnGraphFilter,
  OnViewOptions,
  PreloadApis,
  View,
  ViewDetails,
  ViewGraph,
} from "../shared-types";
import { defaultAppOptions, defaultView } from "../shared-types";
import { Panes } from "./Panes";
import { TextView } from "./TextView";
import { log } from "./log";
import { useFontSize, useZoomPercent } from "./useZoomPercent";
import { getAppOptions, getCenter, getLeft, getRight } from "./viewGraph";

declare global {
  export interface Window {
    preloadApis: PreloadApis;
  }
}

const mainApi = window.preloadApis.mainApi;

let once = false;

const isViewGraph = (view: View): view is ViewGraph => (view as ViewGraph).graphViewOptions !== undefined;

const App: React.FunctionComponent = () => {
  const [view, setView] = React.useState<View>(defaultView);
  const [details, setDetails] = React.useState<ViewDetails | undefined>(undefined);
  const [appOptions, setAppOptions] = React.useState(defaultAppOptions);

  const zoomPercent = appOptions.zoomPercent;
  const setZoomPercent = (zoomPercent: number): void => onAppOptions({ ...appOptions, zoomPercent });
  const onWheelZoomPercent = useZoomPercent(zoomPercent, setZoomPercent);

  const fontSize = appOptions.fontSize;
  const setFontSize = (fontSize: number): void => onAppOptions({ ...appOptions, fontSize });
  const onWheelFontSize = useFontSize(fontSize, setFontSize);

  React.useEffect(() => {
    if (once) return;
    once = true;

    window.preloadApis.bindIpc({
      showView(view: View): void {
        log("showView");
        setView(view);
        if (!isViewGraph(view)) setDetails(undefined);
      },
      showDetails(details: ViewDetails): void {
        log("showDetails");
        setDetails(details);
      },
      showAppOptions(appOptions: AppOptions): void {
        log("showAppOptions");
        setAppOptions(appOptions);
      },
    });
  });

  const onViewOptions: OnViewOptions = (viewOptions) => mainApi.onViewOptions(viewOptions);
  const onAppOptions: OnAppOptions = (appOptions) => mainApi.onAppOptions(appOptions);
  const onGraphClick: OnGraphClick = (graphEvent) => mainApi.onGraphClick(graphEvent);
  const onGraphFilter: OnGraphFilter = (filterEvent) => mainApi.onGraphFilter(filterEvent);
  const onDetailClick: OnDetailClick = (nodeId) => mainApi.onDetailClick(nodeId);

  if (!isViewGraph(view)) {
    return (
      <React.StrictMode>
        <TextView view={view} fontSize={fontSize} onWheelFontSize={onWheelFontSize} />
      </React.StrictMode>
    );
  }

  const rightWidthMaxContent = (() => {
    switch (details?.detailType) {
      case undefined:
        return false;
      case "assemblyDetails":
        return true;
      case "methodDetails":
        return false;
    }
  })();

  return (
    <React.StrictMode>
      <Panes
        left={getLeft(view, onViewOptions, onGraphFilter, appOptions, onAppOptions)}
        center={getCenter(view, onGraphClick, zoomPercent)}
        right={getRight(details, onDetailClick)}
        appOptions={getAppOptions(appOptions, onAppOptions)}
        fontSize={fontSize}
        onWheelZoomPercent={onWheelZoomPercent}
        onWheelFontSize={onWheelFontSize}
        rightWidthMaxContent={rightWidthMaxContent}
      />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
