// this is called from fs which is called from log
// so don't import log to avoid circular dependency

let appDataPath: string | undefined;

export const setAppDataPath = (value: string): void => {
  appDataPath = value;
};

export const getAppDataPath = (): string => {
  if (!appDataPath) throw new Error("appDataPath not set");
  return appDataPath;
};
