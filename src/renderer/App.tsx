import * as React from "react";
import type { BindIpc, MainApi, PreloadApis, RendererApi, View } from "../shared-types";
import { Graph } from "./Graph";
import { Message } from "./Message";
import { Panes } from "./Panes";
import { Tree } from "./Tree";
import { log } from "./log";
import { useZoomPercent } from "./useZoomPercent";

declare global {
  export interface Window {
    preloadApis: PreloadApis;
  }
}

export const mainApi: MainApi = window.preloadApis.mainApi;
export const bindIpc: BindIpc = window.preloadApis.bindIpc;

const defaultView: View = { image: "", groups: [], leafVisible: [], groupExpanded: [] };

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState<string | undefined>("No data");
  const [view, setView] = React.useState(defaultView);
  const [zoomPercent, onWheel] = useZoomPercent();

  React.useEffect(() => {
    const rendererApi: RendererApi = {
      // tslint:disable-next-line:no-shadowed-variable
      setGreeting(greeting: string): void {
        setGreeting(greeting);
      },
      showView(view: View): void {
        log("setView");
        setGreeting(undefined);
        setView(view);
      },
    };
    bindIpc(rendererApi);
  });

  const setLeafVisible: (names: string[]) => void = (names) => mainApi.setLeafVisible(names);
  const setGroupExpanded: (names: string[]) => void = (names) => mainApi.setGroupExpanded(names);

  // display a message, or an image if there is one
  const center = greeting ? (
    <Message message={greeting} />
  ) : typeof view.image === "string" ? (
    <Message message={view.image} />
  ) : (
    <Graph imagePath={view.image.imagePath} areas={view.image.areas} now={view.image.now} zoomPercent={zoomPercent} />
  );

  return (
    <React.StrictMode>
      <Panes
        left={
          <Tree
            nodes={view.groups}
            leafVisible={view.leafVisible}
            groupExpanded={view.groupExpanded}
            setLeafVisible={setLeafVisible}
            setGroupExpanded={setGroupExpanded}
          />
        }
        center={center}
        // right={greeting} TODO later display something in the right pane sometimes
        onWheel={onWheel}
      />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
