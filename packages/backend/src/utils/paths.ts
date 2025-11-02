import type { Paths } from "../contracts-app";

// this is called from fs which is called from log
// so don't import log to avoid circular dependency

let paths: Paths | undefined;

export const setPaths = (value: Paths): void => {
  paths = value;
};

export const getAppDataPath = (): string => {
  if (!paths) throw new Error("paths not set");
  return paths.appDataPath;
};

export const getCoreExePath = (): string => {
  if (!paths) throw new Error("paths not set");
  return paths.coreExePath;
};
