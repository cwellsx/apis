// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-explicit-any */
import { MainApiAsync } from "../contracts-app";
import { logApi } from "./log";

const logMethodName = (methodName: string, args: unknown[]): void => {
  if (args.length > 0 && args[0] && typeof args[0] === "object") {
    logApi("on", methodName, args[0]);
  } else {
    logApi("on", methodName, {});
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunc = (...args: any[]) => any;

/**
 * wrapAllFunctions
 * - T must be an object whose properties are functions
 * - returns the same T so callers retain exact param/return types
 */
export function wrapAllFunctions<T extends Record<string, AnyFunc>>(api: T): T {
  const out = {} as T;

  for (const k in api) {
    const fn = api[k] as AnyFunc;
    const methodName: string = k;

    const wrapper = (...args: unknown[]) => {
      logMethodName(methodName, args);
      // forward to original; local cast because TS can't infer apply safety here
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return fn.apply(api, args);
    };

    // cast wrapper to the precise property type T[typeof k]
    out[k as keyof T] = wrapper as unknown as T[typeof k];
  }

  return out;
}

export const logApiMain = (api: MainApiAsync): MainApiAsync => wrapAllFunctions(api);
