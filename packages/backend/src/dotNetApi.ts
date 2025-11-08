import { Connection, ConnectionBuilder } from "electron-cgi";
import { getCoreExePath, log } from "./utils";

// instantiate the Connection instance
let connection: Connection | undefined = undefined;
const getConnection = (): Connection => {
  if (!connection) {
    const coreExePath = getCoreExePath();
    log(`getCoreExePath() is ${coreExePath}`);
    connection = new ConnectionBuilder().connectTo(coreExePath).build();
    connection.onDisconnect = () => {
      log("core disconnected");
      connection = undefined;
    };
  }
  return connection;
};

export const getWhen = (directory: string): Promise<string> => {
  return getConnection().send("when", directory) as Promise<string>;
};
export const getJson = (directory: string): Promise<string> => {
  return getConnection().send("json", directory) as Promise<string>;
};
