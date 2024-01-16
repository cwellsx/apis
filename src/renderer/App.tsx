import * as React from "react";
import { Panes } from "./Panes";
import { Graph } from "./Graph";
import { Tree } from "./Tree";

import type { BindIpc, MainApi, PreloadApis, RendererApi, View } from "../shared-types";
import { log } from "./log";

declare global {
  export interface Window {
    preloadApis: PreloadApis;
  }
}

export const mainApi: MainApi = window.preloadApis.mainApi;
export const bindIpc: BindIpc = window.preloadApis.bindIpc;

const defaultView: View = { imagePath: "", areas: [], nodes: [], now: 0 };

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState("Hello...");
  const [view, setView] = React.useState(defaultView);

  React.useEffect(() => {
    const rendererApi: RendererApi = {
      // tslint:disable-next-line:no-shadowed-variable
      setGreeting(greeting: string): void {
        setGreeting(greeting);
        mainApi.setTitle(greeting);
      },
      showView(view: View): void {
        log("setView");
        setView(view);
      },
    };
    bindIpc(rendererApi);
  });

  const setShown: (names: string[]) => void = (names) => mainApi.setShown(names);

  return (
    <React.StrictMode>
      <Panes
        left={<Tree nodes={view.nodes} setShown={setShown} />}
        center={<Graph imagePath={view.imagePath} areas={view.areas} now={view.now} />}
        right={greeting}
      />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
