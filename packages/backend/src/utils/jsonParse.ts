export const jsonParse = <T>(text: string): T => {
  return JSON.parse(text) as T;
};

export type Asserter<T> = (json: unknown) => asserts json is T;

export const jsonParseT = <T>(text: string, assertT: Asserter<T>): T => {
  const json = JSON.parse(text) as unknown;
  assertT(json);
  return json;
};
