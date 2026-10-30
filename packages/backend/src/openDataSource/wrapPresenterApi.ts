import { AnyEvent, PresenterApi } from "../contracts-ui";
import { log, options } from "../utils";

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
  const replacer: (this: unknown, key: string, value: unknown) => unknown = (key, value) =>
    key === "parent" ? "(circular)" : value;

  const value = args.length == 1 ? args[0] : args;
  const json = JSON.stringify(value, replacer, " ");
  log(json);
};

export const wrapPresenterApi = (presenter: PresenterApi): PresenterApi => {
  if (!options.logApi) return presenter;
  const wrapped: PresenterApi = async (events: AnyEvent[]) => {
    logData(events);
    const results = await presenter(events);
    logData(results);
    return results;
  };
  return wrapped;
};
