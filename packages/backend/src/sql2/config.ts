import { SqlTable } from "sqlio";
import { ViewType } from "./viewType";

type ConfigKeys = "when" | "schema" | "viewType";
export type ConfigKvps = { key: ConfigKeys; value: string };

export type Config = {
  getWhen: () => string | undefined;
  setWhen: (value: string) => void;
  getSchema: () => string | undefined;
  setSchema: (value: string) => void;
  getViewType: () => ViewType | undefined;
  setViewType: (value: ViewType) => void;
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
    // viewType
    getViewType: () => getConfig("viewType") as ViewType | undefined,
    setViewType: (value: ViewType) => setConfig("viewType", value),
  };
};
