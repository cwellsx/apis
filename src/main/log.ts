import * as process from "process";

export function log(message: string) {
  // this helps to show how long the various stages of application startup are
  const time = process.uptime();
  console.log(`${time.toFixed(3)} ${message}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logJson(value: any) {
  console.log(JSON.stringify(value));
}
