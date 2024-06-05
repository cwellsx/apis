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
} from "../shared-types";
import { defaultAppOptions, defaultView } from "../shared-types";
import { Panes } from "./Panes";
import { getCenter, getLeft, getRight, isGreeting } from "./appViews";
import { log } from "./log";
import { useFontSize, useZoomPercent } from "./useZoomPercent";

declare global {
  export interface Window {
    preloadApis: PreloadApis;
  }
}

const mainApi = window.preloadApis.mainApi;

let once = false;

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
    });
  });

  const onViewOptions: OnViewOptions = (viewOptions) => mainApi.onViewOptions(viewOptions);
  const onAppOptions: OnAppOptions = (appOptions) => mainApi.onAppOptions(appOptions);
  const onGraphClick: OnGraphClick = (graphEvent) => mainApi.onGraphClick(graphEvent);
  const onGraphFilter: OnGraphFilter = (filterEvent) => mainApi.onGraphFilter(filterEvent);
  const onDetailClick: OnDetailClick = (nodeId) => mainApi.onDetailClick(nodeId);

  return (
    <React.StrictMode>
      <Panes
        left={getLeft(view, onViewOptions, onGraphFilter)}
        center={getCenter(view, onGraphClick, zoomPercent)}
        right={getRight(details, onDetailClick)}
        fontSize={fontSize}
        onWheelZoomPercent={onWheelZoomPercent}
        onWheelFontSize={onWheelFontSize}
      />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
