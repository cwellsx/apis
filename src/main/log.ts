import * as process from "process";
import { appendFileSync, getAppFilename, getLogFilename } from "./fs";
import { options } from "./shared-types";

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

export const logApi = (event: "on" | "send", channel: string, o: object): void => {
  if (!options.logApi) return;
  const now = new Date();
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const dateString = `${now.getFullYear()}${pad2(now.getMonth())}${pad2(now.getDate())}`;
  const timeString = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
  const logFilePath = getLogFilename(`${dateString}-${timeString}-${event}-${channel}.json`);

  const replacer: (this: unknown, key: string, value: unknown) => unknown = (key, value) =>
    key === "parent" ? "(circular)" : value;

  const json = JSON.stringify(o, replacer, " ");
  appendFileSync(logFilePath, json);
};
