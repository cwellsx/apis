import { ConnectionBuilder } from "electron-cgi";

import { log } from "./log";

// this API is implemented by the C#
export interface DotNetApi {
  getGreeting: (name: string) => Promise<string>;
  getWhen: (directory: string) => Promise<string>;
  getJson: (directory: string) => Promise<string>;
}

export function createDotNetApi(command: string, ...args: string[]): DotNetApi {
  // instantiate the Connection instance
  const connection = new ConnectionBuilder().connectTo(command, ...args).build();

  // use the connection instance to implement the API
  const dotNetApi = {
    getGreeting(name: string): Promise<string> {
      return connection.send("greeting", name) as Promise<string>;
    },
    getWhen(directory: string): Promise<string> {
      return connection.send("when", directory) as Promise<string>;
    },
    getJson(directory: string): Promise<string> {
      return connection.send("json", directory) as Promise<string>;
    },
  };

  connection.onDisconnect = () => {
    log("core disconnected");
  };

  return dotNetApi;
}
