// import type {
//   AppOptions,
//   OnAppOptions,
//   OnDetailEvent,
//   OnFilterEvent,
//   OnGraphEvent,
//   PreloadApis,
//   View,
//   ViewDetails,
//   ViewGreeting,
// } from "backend-ui";
import { AnyEvent, AnyView, defaultAppOptions, Image, Node, TextView as TextViewData } from "backend-ui";
import * as React from "react";
import { PRELOAD_API_KEY, PreloadApis, RendererApi } from "../shared";
import { beep } from "./components";
// import { AssemblyDetails } from "./details/AssemblyDetails";
// import { CustomDetails } from "./details/CustomDetails";
// import { MethodDetails } from "./details/MethodDetails";
import { Message } from "./elements";
import { Graph } from "./Graph";
import { Layout } from "./Layout";
import { Nodes } from "./Nodes";
import { OnAppOptions, OnFilterEvent, OnGraphEvent } from "./onEvent";
import { TextView } from "./TextView";
import { useFontSize, useZoomPercent } from "./useZoomPercent";

declare global {
  export interface Window {
    [PRELOAD_API_KEY]: PreloadApis;
  }
}

const { mainApi, bindIpc } = window[PRELOAD_API_KEY];

let once = false;

//const isViewGreeting = (view: View): view is ViewGreeting => (view as ViewGreeting).viewType == "greeting";

const App: React.FunctionComponent = () => {
  // const [view, setView] = React.useState<View>(defaultView);

  // viewVersion is used with useEffect inside the Layout element -- it's used to snap the width of
  // the left-hand pane to the size of the node tree once, each time the node tree state is changed
  const [viewVersion, setViewVersion] = React.useState<number>(0);

  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [image, setImage] = React.useState<Image | string>("");
  const [textView, setTextView] = React.useState<TextViewData | undefined>(undefined);

  //  const [details, setDetails] = React.useState<ViewDetails | undefined>(undefined);
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

  const rendererApi: RendererApi = {
    show: (views: AnyView[]): void => {
      // a text message will erase every other view
      setTextView(undefined);

      views.forEach((view) => {
        switch (view.type) {
          case "appOptions":
            setAppOptions(view.payload);
            return;
          case "nodes":
            setNodes(view.payload.nodes);
            incrementViewVersion();
            return;
          case "image":
            setImage(view.payload.image);
            return;
          case "text":
            setTextView(view.payload);
            return;
        }
      });

      setIsBusy(false);
    },
  };

  React.useEffect(() => {
    if (once) return;
    once = true;
    bindIpc(rendererApi);
  });

  React.useEffect(() => {
    document.body.classList.toggle("busy", isBusy);
  }, [isBusy]);

  const on = (event: AnyEvent) => {
    if (isBusy) {
      beep();
      return;
    }
    setIsBusy(true);
    mainApi.onEvent([event]);
  };

  const onAppOptions: OnAppOptions = (appOptions) => on({ type: "appOptions", payload: appOptions });
  const onGraphEvent: OnGraphEvent = (graphEvent) => on({ type: "graph", payload: graphEvent });
  const onFilterEvent: OnFilterEvent = (filterEvent) => on({ type: "filter", payload: filterEvent });
  // const onDetailEvent: OnDetailEvent = (nodeId) => on(nodeId, mainApi.onDetailEvent);

  if (textView) {
    return (
      <React.StrictMode>
        <TextView
          view={textView}
          fontSize={fontSize}
          onWheelFontSize={onWheelFontSize}
          appOptions={appOptions}
          onAppOptions={onAppOptions}
        />
      </React.StrictMode>
    );
  }

  const rightWidthMaxContent = (() => {
    return false;
    // switch (details?.detailType) {
    //   case undefined:
    //     return false;
    //   case "assemblyDetails":
    //     return true;
    //   case "methodDetails":
    //     return false;
    //   case "customDetails":
    //     return false;
    // }
  })();

  const chooseAppOptions = <>App options placeholder</>;

  const left = (
    <>
      <Nodes nodes={nodes} onFilterEvent={onFilterEvent} />
    </>
  );

  const center =
    typeof image === "string" ? (
      <Message message={image} />
    ) : (
      <Graph
        imagePath={image.imagePath}
        areas={image.areas}
        now={image.now}
        zoomPercent={zoomPercent}
        onGraphEvent={onGraphEvent}
      />
    );

  const right = (() => {
    return undefined;
    // if (!details) return undefined;
    // switch (details.detailType) {
    //   case "assemblyDetails":
    //     return <AssemblyDetails types={details} onDetailEvent={onDetailEvent} />;
    //   case "methodDetails":
    //     return <MethodDetails methodBody={details} />;
    //   case "customDetails":
    //     return <CustomDetails details={details} />;
    // }
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
