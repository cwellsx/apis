import * as React from "react";
import { Dashboard } from "./Dashboard";
import { Panes } from "./Panes";

import type { BindIpc, MainApi, PreloadApis, RendererApi } from "../shared-types";

declare global {
  export interface Window {
    preloadApis: PreloadApis;
  }
}

export const mainApi: MainApi = window.preloadApis.mainApi;
export const bindIpc: BindIpc = window.preloadApis.bindIpc;

const App: React.FunctionComponent = () => {
  const [greeting, setGreeting] = React.useState("Hello...");

  React.useEffect(() => {
    const rendererApi: RendererApi = {
      // tslint:disable-next-line:no-shadowed-variable
      setGreeting(greeting: string): void {
        setGreeting(greeting);
        mainApi.setTitle(greeting);
      },
    };
    bindIpc(rendererApi);
  });

  return (
    <React.StrictMode>
      <Panes left={"pane 1"} center={<Dashboard greeting={greeting} />} right={"pane 3"} />
    </React.StrictMode>
  );
};

export const createApp = () => <App />;
