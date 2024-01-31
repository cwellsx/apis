import { logError } from "./log";

type Exception = {
  ClassName: string;
  Message: string;
  StackTraceString: string;
};
const isDotNetException = (error: unknown): error is Exception => {
  return (error as Exception).ClassName !== undefined;
};
const showDotNetException = (error: unknown): string | undefined => {
  return isDotNetException(error) ? `${error.ClassName}\r\n${error.Message}\r\n${error.StackTraceString}` : undefined;
};

const isError = (error: unknown): error is Error => {
  return (error as Error).stack !== undefined;
};
const showError = (error: unknown): string | undefined => {
  return isError(error) ? (error.stack ? error.stack : "" + error) : undefined;
};

export const getErrorString = (error: unknown): string => {
  const message = showError(error) ?? showDotNetException(error) ?? JSON.stringify(error);
  logError(message);
  return message;
};
