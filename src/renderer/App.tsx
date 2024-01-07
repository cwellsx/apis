import * as React from "react";
import { Dashboard } from "./Dashboard";
import { Panes } from "./Panes";
import { Graph } from "./Graph";

import type { BindIpc, MainApi, PreloadApis, RendererApi, View } from "../shared-types";

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
        setView(view);
      },
    };
    bindIpc(rendererApi);
  });

  return (
    <React.StrictMode>
      <Panes
        left={"pane 1"}
        center={<Graph imagePath={view.imagePath} areas={view.areas} now={view.now} />}
        right={<Dashboard greeting={greeting} />}
      />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
