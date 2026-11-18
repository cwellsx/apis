import { AppEvent, PresenterApi } from "../contracts-app";
import { log, options, stringify } from "../utils";

const logTimeStamp = (): void => {
  const now = new Date(Date.now());
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const pad3 = (n: number) => n.toString().padStart(3, "0");
  const dateString = `${now.getFullYear()}${pad2(now.getMonth())}${pad2(now.getDate())}`;
  const timeString = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}${pad3(now.getMilliseconds())}`;
  log(`${dateString}-${timeString}`);
};

const logData = (args: unknown[]): void => {
  logTimeStamp();
  const value = args.length == 1 ? args[0] : args;
  const json = stringify(value);
  log(json);
};

export const wrapPresenterApi = (presenter: PresenterApi): PresenterApi => {
  if (!options.logApi) return presenter;
  const wrapped: PresenterApi = async (events: AppEvent[]) => {
    logData(events);
    const results = await presenter(events);
    logData(results);
    return results;
  };
  return wrapped;
};
