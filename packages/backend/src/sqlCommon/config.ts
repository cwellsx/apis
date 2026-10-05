import { SqlTable } from "sqlio";

type ConfigKeys = "when";

type UnionT<T extends string> = T | ConfigKeys;

export type ConfigKvpT<T extends string> = { key: UnionT<T>; value: string };

export type ConfigT<T extends string> = {
  getConfig: (key: UnionT<T>) => string | undefined;
  setConfig: (key: UnionT<T>, value: string) => void;

  getWhen: () => string | undefined;
  setWhen: (value: string) => void;
};

export const configT = <T extends string>(table: SqlTable<ConfigKvpT<T>>): ConfigT<T> => {
  const getConfig = (key: UnionT<T>): string | undefined => table.selectOne({ key })?.value;
  const setConfig = (key: UnionT<T>, value: string): void => table.upsert({ key, value });

  return {
    getConfig,
    setConfig,
    // when
    getWhen: () => getConfig("when"),
    setWhen: (value: string) => setConfig("when", value),
  };
};

// example of how to extend this

type ConfigKeysTheme = UnionT<"theme">;
type ConfigKvpTheme = ConfigKvpT<"theme">;
type ConfigMore = ConfigT<ConfigKeysTheme> & {
  getTheme: () => "light" | "dark" | undefined;
  setTheme: (value: "light" | "dark") => void;
};
export const configTheme = (table: SqlTable<ConfigKvpTheme>): ConfigMore => {
  const base = configT<"theme">(table);
  return {
    ...base,
    getTheme: () => base.getConfig("theme") as "light" | "dark" | undefined,
    setTheme: (value: "light" | "dark") => base.setConfig("theme", value),
  };
};
