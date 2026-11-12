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
import {
  AppOptions,
  appOptionsSchemas,
  appOptionsSection,
  defaultAppOptions,
  defaultDotnetOptions,
} from "backend-config";
import { AnyEvent, AnyView, Image, Node, TextView as TextViewData } from "backend-ui";
import * as React from "react";
import { PRELOAD_API_KEY, PreloadApis, RendererApi } from "../shared";
import { beep } from "./components";
import { ConfigurationView } from "./configuration";
// import { AssemblyDetails } from "./details/AssemblyDetails";
// import { CustomDetails } from "./details/CustomDetails";
// import { MethodDetails } from "./details/MethodDetails";
import { Message } from "./elements";
import { Graph } from "./graphs";
import { Layout } from "./Layout";
import { Nodes } from "./nodes";
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

  // the dotnet view's options, which the app owns as it owns appOptions: the app sends them and this holds them
  // until something reads them, and the panel which will read them -- the only thing which will -- is not built
  const [dotnetOptions, setDotnetOptions] = React.useState(defaultDotnetOptions);

  const [isBusy, setIsBusy] = React.useState(false);

  // Which option groups are open, which is worth nothing to the backend and so is not stored there: it lasts
  // as long as the window does, and until then a group is closed. A hook, so it belongs up here with the rest:
  // the text view returns early below, and a hook after that return is a hook called on some renders only.
  const [openGroups, setOpenGroups] = React.useState<string[]>([]);

  const toggleGroup = (group: string, isOpen: boolean): void =>
    setOpenGroups((current) => (isOpen ? [...new Set([...current, group])] : current.filter((it) => it !== group)));

  // the one way out of the renderer: every event goes through here, and the app sends the new state back
  const on = (event: AnyEvent) => {
    if (isBusy) {
      beep();
      return;
    }
    setIsBusy(true);
    mainApi.onEvent([event]);
  };

  // these are declared before the handlers which use them, so that each one reads in terms of what is above it
  const onAppOptions: OnAppOptions = (appOptions) => on({ type: "appOptions", payload: appOptions });
  const onGraphEvent: OnGraphEvent = (graphEvent) => on({ type: "graph", payload: graphEvent });
  const onFilterEvent: OnFilterEvent = (filterEvent) => on({ type: "filter", payload: filterEvent });
  // const onDetailEvent: OnDetailEvent = (nodeId) => on(nodeId, mainApi.onDetailEvent);

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
          case "dotnetOptions":
            setDotnetOptions(view.payload);
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

  const chooseAppOptions = (
    <ConfigurationView
      sources={[
        {
          section: appOptionsSection,
          schema: appOptionsSchemas,
          data: appOptions,
          // The panel reports the options as edited and does not apply them: the state changes when the app sends
          // them back, which is also what stores them, so the panel always shows what was last stored.
          onChange: (values) => onAppOptions(values as AppOptions),
        },
      ]}
      openGroups={openGroups}
      onToggleGroup={toggleGroup}
    />
  );

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
        svg={image.svg}
        edgePopups={image.edgePopups}
        zoomPercent={zoomPercent}
        onWheelZoomPercent={onWheelZoomPercent}
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
};

export const createApp = () => <App />;
