export const stringify = (value: unknown): string => {
  const replacer: (this: unknown, key: string, value: unknown) => unknown = (key, value) =>
    key === "parent" ? "(circular)" : value;

  return JSON.stringify(value, replacer, " ");
};
