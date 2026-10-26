import type {
  AppOptions,
  OnAppOptions,
  OnDetailEvent,
  OnFilterEvent,
  OnGraphEvent,
  OnViewOptions,
  PreloadApis,
  View,
  ViewDetails,
  ViewGraph,
} from "backend-ui";
import { defaultAppOptions, defaultView } from "backend-ui";
import * as React from "react";
import { AssemblyDetails } from "./AssemblyDetails";
import { beep } from "./components";
import { CustomDetails } from "./CustomDetails";
import { Message } from "./elements";
import { Graph } from "./Graph";
import { Layout } from "./Layout";
import { log } from "./log";
import { MethodDetails } from "./MethodDetails";
import { Nodes } from "./Nodes";
import { ChooseAppOptions, ChooseGraphViewOptions } from "./Options";
import { TextView } from "./TextView";
import { useFontSize, useZoomPercent } from "./useZoomPercent";

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
  const [viewVersion, setViewVersion] = React.useState<number>(0);
  const [details, setDetails] = React.useState<ViewDetails | undefined>(undefined);
  const [appOptions, setAppOptions] = React.useState(defaultAppOptions);

  const [isBusy, setIsBusy] = React.useState(false);

  const zoomPercent = appOptions.zoomPercent;
  const setZoomPercent = (zoomPercent: number): void => onAppOptions({ ...appOptions, zoomPercent });
  const onWheelZoomPercent = useZoomPercent(zoomPercent, setZoomPercent);

  const fontSize = appOptions.fontSize;
  const setFontSize = (fontSize: number): void => onAppOptions({ ...appOptions, fontSize });
  const onWheelFontSize = useFontSize(fontSize, setFontSize);

  const incrementViewVersion = () => {
    // 🔥 Pass a function down. React injects the absolute latest
    // live value into 'prev' directly from its internal state queue.
    setViewVersion((prev) => {
      const nextVersion = prev + 1;
      console.log(`Incrementing version to: ${nextVersion}`); // Correctly logs the real update
      return nextVersion;
    });
  };

  React.useEffect(() => {
    if (once) return;
    once = true;

    window.preloadApis.bindIpc({
      showView(view: View): void {
        log("showView");
        setView(view);
        incrementViewVersion();
        if (!isViewGraph(view)) setDetails(undefined);
        setIsBusy(false);
      },
      showDetails(details: ViewDetails): void {
        log("showDetails");
        setDetails(details);
        setIsBusy(false);
      },
      showAppOptions(appOptions: AppOptions): void {
        log("showAppOptions");
        setAppOptions(appOptions);
        setIsBusy(false);
      },
    });
  });

  React.useEffect(() => {
    document.body.classList.toggle("busy", isBusy);
  }, [isBusy]);

  const on = <TParam, TMethod extends (param: TParam) => void>(param: TParam, method: TMethod) => {
    if (isBusy) {
      beep();
      return;
    }
    setIsBusy(true);
    method(param);
  };

  const onViewOptions: OnViewOptions = (viewOptions) => on(viewOptions, mainApi.onViewOptions);
  const onAppOptions: OnAppOptions = (appOptions) => on(appOptions, mainApi.onAppOptions);
  const onGraphEvent: OnGraphEvent = (graphEvent) => on(graphEvent, mainApi.onGraphEvent);
  const onFilterEvent: OnFilterEvent = (filterEvent) => on(filterEvent, mainApi.onFilterEvent);
  const onDetailEvent: OnDetailEvent = (nodeId) => on(nodeId, mainApi.onDetailEvent);

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

  const checkModel = view.isCheckModelAll ? "all" : "leaf";

  const left = (
    <>
      <ChooseGraphViewOptions
        viewOptions={view.graphViewOptions}
        onViewOptions={onViewOptions}
        appOptions={appOptions}
        onAppOptions={onAppOptions}
      />
      <Nodes checkModel={checkModel} nodes={view.groups} onFilterEvent={onFilterEvent} />
    </>
  );

  const center =
    typeof view.image === "string" ? (
      <Message message={view.image} />
    ) : (
      <Graph
        imagePath={view.image.imagePath}
        areas={view.image.areas}
        now={view.image.now}
        zoomPercent={zoomPercent}
        onGraphEvent={onGraphEvent}
        useKeyStates={view.graphViewOptions.graphType == "references"}
      />
    );

  const right = (() => {
    if (!details) return undefined;
    switch (details.detailType) {
      case "assemblyDetails":
        return <AssemblyDetails types={details} onDetailEvent={onDetailEvent} />;
      case "methodDetails":
        return <MethodDetails methodBody={details} />;
      case "customDetails":
        return <CustomDetails details={details} />;
    }
  })();

  return <Layout left={left} center={center} right={right} appOptions={chooseAppOptions} viewVersion={viewVersion} />;
  // return (
  //   <React.StrictMode>
  //     <Panes
  //       left={getLeft(view, onViewOptions, onFilterEvent, appOptions, onAppOptions)}
  //       center={getCenter(view, onGraphEvent, zoomPercent)}
  //       right={getRight(details, onDetailEvent)}
  //       appOptions={chooseAppOptions}
  //       fontSize={fontSize}
  //       onWheelZoomPercent={onWheelZoomPercent}
  //       onWheelFontSize={onWheelFontSize}
  //       rightWidthMaxContent={rightWidthMaxContent}
  //     />
  //   </React.StrictMode>
  // );
};

export const createApp = () => <App />;
