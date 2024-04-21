import * as React from "react";
import { Graph } from "../renderer.shared/Graph";
import { Message } from "../renderer.shared/Message";
import { Panes } from "../renderer.shared/Panes";
import { log } from "../renderer.shared/log";
import { useFontSize, useZoomPercent } from "../renderer.shared/useZoomPercent";
import type {
  AppOptions,
  Bind2Ipc,
  CallStack,
  Main2Api,
  OnGraphClick,
  Preload2Apis,
  Renderer2Api,
  ViewOptions,
} from "../shared-types";
import { defaultAppOptions } from "../shared-types";

declare global {
  export interface Window {
    preload2Apis: Preload2Apis;
  }
}
const mainApi: Main2Api = window.preload2Apis.mainApi;
const bindIpc: Bind2Ipc = window.preload2Apis.bindIpc;

let once = false;
const defaultCallstack: CallStack = { image: "", asText: {} };

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState<string | undefined>("No data");
  const [callStack, setCallStack] = React.useState(defaultCallstack);

  const [appOptions, setAppOptions_] = React.useState(defaultAppOptions);
  const sendAppOptions = (newOptions: Partial<AppOptions>): void => setAppOptions({ ...appOptions, ...newOptions });
  const zoomPercent = appOptions.zoomPercent;
  const fontSize = appOptions.fontSize;
  const onWheelZoomPercent = useZoomPercent(zoomPercent, (zoomPercent: number) => sendAppOptions({ zoomPercent }));
  const onWheelFontSize = useFontSize(fontSize, (fontSize: number) => sendAppOptions({ fontSize }));

  React.useEffect(() => {
    if (once) return;
    once = true;
    const renderer2Api: Renderer2Api = {
      showCallStack: (callStack: CallStack): void => {
        log("showCallStack");
        setGreeting(undefined);
        setCallStack(callStack);
      },
      showAppOptions(appOptions: AppOptions): void {
        log("showAppOptions");
        setAppOptions_(appOptions);
      },
    };
    bindIpc(renderer2Api);
  });

  const setViewOptions: (viewOptions: ViewOptions) => void = (viewOptions) => mainApi.setView2Options(viewOptions);
  const setAppOptions: (appOptions: AppOptions) => void = (appOptions) => mainApi.setAppOptions(appOptions);
  const onGraphClick: OnGraphClick = (id, event) => {
    // TODO
  };

  // display a message, or an image if there is one
  const left = greeting ? (
    <Message message={greeting} />
  ) : typeof callStack.image === "string" ? (
    <Message message={callStack.image} />
  ) : (
    <Graph
      imagePath={callStack.image.imagePath}
      areas={callStack.image.areas}
      now={callStack.image.now}
      zoomPercent={zoomPercent}
      onGraphClick={onGraphClick}
    />
  );

  const center = <>Hello</>;
  return (
    <React.StrictMode>
      <Panes
        left={left}
        center={center}
        fontSize={fontSize}
        onWheelZoomPercent={onWheelZoomPercent}
        onWheelFontSize={onWheelFontSize}
      />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
