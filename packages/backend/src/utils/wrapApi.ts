// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-explicit-any */
import { appendFileSync, getLogFilename } from "./fs";
import { log } from "./log";

type Event = "on" | "send";

// ensure that each time we call this the value increases by at least 1 msec
// though it may be a simulated increase -- it does not actually stall
let previousDate: number | undefined = undefined;
const newDate = (): Date => {
  let now = Date.now();
  if (previousDate && previousDate >= now) now = previousDate + 1;
  previousDate = now;
  return new Date(now);
};

const logMethodName = (event: Event, methodName: string, args: unknown[]): void => {
  log(`logApi: ${event}.${methodName}`);
  const now = newDate();
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const pad3 = (n: number) => n.toString().padStart(3, "0");
  const dateString = `${now.getFullYear()}${pad2(now.getMonth())}${pad2(now.getDate())}`;
  const timeString = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}${pad3(now.getMilliseconds())}`;
  const logFilePath = getLogFilename(`${dateString}-${timeString}-${event}-${methodName}.json`);

  const replacer: (this: unknown, key: string, value: unknown) => unknown = (key, value) =>
    key === "parent" ? "(circular)" : value;

  const value = args.length == 1 ? args[0] : args;
  const json = JSON.stringify(value, replacer, " ");
  appendFileSync(logFilePath, json);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunc = (...args: any[]) => any;

/**
 * wrapAllFunctions
 * - T must be an object whose properties are functions
 * - returns the same T so callers retain exact param/return types
 */
export function wrapApi<T extends Record<string, AnyFunc>>(event: Event, api: T): T {
  const out = {} as T;

  for (const k in api) {
    const fn = api[k] as AnyFunc;
    const methodName: string = k;

    const wrapper = (...args: unknown[]) => {
      logMethodName(event, methodName, args);
      // forward to original; local cast because TS can't infer apply safety here
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return fn.apply(api, args);
    };

    // cast wrapper to the precise property type T[typeof k]
    out[k as keyof T] = wrapper as unknown as T[typeof k];
  }

  return out;
}
