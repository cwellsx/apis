import * as React from "react";
import type {
  AppOptions,
  DetailEvent,
  FilterEvent,
  GraphEvent,
  OnUserEvent,
  PreloadApis,
  View,
  ViewDetails,
  ViewGraph,
  ViewOptions,
} from "../shared-types";
import { defaultAppOptions, defaultView } from "../shared-types";
import { ChooseAppOptions } from "./Options";
import { Panes } from "./Panes";
import { TextView } from "./TextView";
import { log } from "./log";
import { useFontSize, useZoomPercent } from "./useZoomPercent";
import { getCenter, getLeft, getRight } from "./viewGraph";

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

  const onViewOptions: OnUserEvent<ViewOptions> = (viewOptions) => mainApi.onViewOptions(viewOptions);
  const onAppOptions: OnUserEvent<AppOptions> = (appOptions) => {
    log("onAppOptions!");
    mainApi.onAppOptions(appOptions);
  };
  const onGraphEvent: OnUserEvent<GraphEvent> = (graphEvent) => mainApi.onGraphEvent(graphEvent);
  const onFilterEvent: OnUserEvent<FilterEvent> = (filterEvent) => mainApi.onFilterEvent(filterEvent);
  const onDetailEvent: OnUserEvent<DetailEvent> = (nodeId) => mainApi.onDetailEvent(nodeId);

  if (!isViewGraph(view)) {
    return (
      <React.StrictMode>
        <TextView
          view={view}
          fontSize={fontSize}
          onWheelFontSize={onWheelFontSize}
          onViewOptions={onViewOptions}
          appOptions={appOptions}
          onAppOptions={onAppOptions}
        />
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
      case "customDetails":
        return false;
    }
  })();

  const chooseAppOptions = <ChooseAppOptions appOptions={appOptions} onAppOptions={onAppOptions} />;

  return (
    <React.StrictMode>
      <Panes
        left={getLeft(view, onViewOptions, onFilterEvent, appOptions, onAppOptions)}
        center={getCenter(view, onGraphEvent, zoomPercent)}
        right={getRight(details, onDetailEvent)}
        appOptions={chooseAppOptions}
        fontSize={fontSize}
        onWheelZoomPercent={onWheelZoomPercent}
        onWheelFontSize={onWheelFontSize}
        rightWidthMaxContent={rightWidthMaxContent}
      />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
