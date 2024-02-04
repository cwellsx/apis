import * as process from "process";
import { appendFileSync, getAppFilename } from "./fs";

const logFilePath = getAppFilename("!all.log");

const logMessage = (message: string): void => {
  console.log(message);
  appendFileSync(logFilePath, message + "\r\n");
};

export function log(message: string) {
  // this helps to show how long the various stages of application startup are
  const time = process.uptime();
  logMessage(`${time.toFixed(3)} ${message}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logJson(message: string, value?: any) {
  logMessage(!value ? `  ${message}` : `  ${message}: ${JSON.stringify(value)}`);
}

export function logError(message: string) {
  logMessage(message);
}
