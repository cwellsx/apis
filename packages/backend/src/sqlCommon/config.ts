import { SqlTable } from "sqlio";
import { jsonParse } from "../utils";

// the keys which every configuration has, whatever its own keys are
type ConfigKeys = "when" | "options";

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

// The options of this database: one value, kept as JSON under the key "options", with the schema's defaults for
// anything the stored value does not mention -- the shape appOptions has in the app's own configuration.
export type OptionsT<TOptions extends object> = { getOptions: () => TOptions; setOptions: (value: TOptions) => void };

export const optionsT = <TOptions extends object, T extends string>(
  table: SqlTable<ConfigKvpT<T>>,
  defaults: TOptions
): OptionsT<TOptions> => {
  const base = configT<T>(table);

  const getOptions = (): TOptions => {
    const value = base.getConfig("options");
    return value ? { ...defaults, ...jsonParse<Partial<TOptions>>(value) } : defaults;
  };

  const setOptions = (value: TOptions): void => base.setConfig("options", JSON.stringify(value));

  return { getOptions, setOptions };
};

// example of how to extend this

type ConfigKeysTheme = UnionT<"theme" | "layout">;
type ConfigKvpTheme = ConfigKvpT<"theme" | "layout">;
type ConfigMore = ConfigT<ConfigKeysTheme> & {
  getTheme: () => "light" | "dark" | undefined;
  setTheme: (value: "light" | "dark") => void;
  getLayout: () => "simple" | "complex" | undefined;
  setLayout: (value: "simple" | "complex") => void;
};
export const configTheme = (table: SqlTable<ConfigKvpTheme>): ConfigMore => {
  const base = configT<"theme" | "layout">(table);
  return {
    ...base,
    getTheme: () => base.getConfig("theme") as "light" | "dark" | undefined,
    setTheme: (value: "light" | "dark") => base.setConfig("theme", value),
    getLayout: () => base.getConfig("layout") as "simple" | "complex" | undefined,
    setLayout: (value: "simple" | "complex") => base.setConfig("layout", value),
  };
};
