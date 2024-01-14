import { SqlTables, ConfigKey } from "./sqlTables";

export type IValues = {
  [key in ConfigKey]: string | undefined;
};

export class Config {
  private _sqlTables: SqlTables;
  private _values: IValues = {
    path: undefined,
    cachedWhen: undefined,
  };

  constructor(sqlTables: SqlTables) {
    this._sqlTables = sqlTables;
    const pairs = sqlTables.getConfig();
    for (const pair of pairs) this._values[pair.name] = pair.value;
  }

  setValue(name: ConfigKey, value: string | undefined) {
    value = value ?? "";
    this._sqlTables.setConfig({ name, value });
    this._values[name] = value;
  }
  getValue(name: ConfigKey): string | undefined {
    return this._values[name];
  }

  get path(): string | undefined {
    return this._values["path"];
  }
  set path(value: string | undefined) {
    this.setValue("path", value);
  }
  get cachedWhen(): string | undefined {
    return this._values["cachedWhen"];
  }
  set cachedWhen(value: string | undefined) {
    this.setValue("cachedWhen", value);
  }
}
