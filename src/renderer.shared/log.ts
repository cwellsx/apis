// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function log(message: string, value?: any) {
  console.log(!value ? `  ${message}` : `  ${message}: ${JSON.stringify(value)}`);
}
