import { log } from "./log";

let appDataPath: string | undefined;

export const setAppDataPath = (value: string): void => {
  log(`appDataPath=${value}`);
  appDataPath = value;
};

export const getAppDataPath = (): string => {
  if (!appDataPath) throw new Error("appDataPath not set");
  return appDataPath;
};
