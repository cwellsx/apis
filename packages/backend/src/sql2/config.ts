import { SqlTable } from "sqlio";

type ConfigKeys = "when" | "schema";
export type ConfigKvps = { key: ConfigKeys; value: string };

export type Config = {
  getWhen: () => string | undefined;
  setWhen: (value: string) => void;
  getSchema: () => string | undefined;
  setSchema: (value: string) => void;
};

export const config = (table: SqlTable<ConfigKvps>): Config => {
  const getConfig = (key: ConfigKeys): string | undefined => table.selectOne({ key })?.value;
  const setConfig = (key: ConfigKeys, value: string): void => table.upsert({ key, value });

  return {
    // when
    getWhen: () => getConfig("when"),
    setWhen: (value: string) => setConfig("when", value),
    // schema
    getSchema: () => getConfig("schema"),
    setSchema: (value: string) => setConfig("schema", value),
  };
};
