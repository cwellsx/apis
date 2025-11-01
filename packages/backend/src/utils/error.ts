import { logError } from "./log";

type Exception = {
  ClassName: string;
  Message: string;
  StackTraceString: string;
};
const isDotNetException = (error: unknown): error is Exception => {
  return (error as Exception).ClassName !== undefined;
};

const toErrorString = (error: unknown): string => {
  if (isDotNetException(error)) return `${error.ClassName}\r\n${error.Message}\r\n${error.StackTraceString}`;
  if (error instanceof Error) return error.stack ?? error.message ?? String(error);

  // Case: object with message-like field (some libs throw plain objects)
  if (typeof error === "object" && error !== null) {
    // prefer .message when present
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;

    // try to JSON stringify a plain object
    try {
      return JSON.stringify(error);
    } catch {
      // fallback to safe coercion
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(error);
    }
  }

  // Primitives (string, number, boolean, undefined, symbol, bigint)
  return String(error);
};

export const getErrorString = (error: unknown): string => {
  const message = toErrorString(error);
  logError(message);
  return message;
};
