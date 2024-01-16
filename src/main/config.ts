import { ConfigKey } from "./configKey";
import { SqlTables } from "./sqlTables";

type IValues = {
  [key in ConfigKey]: string | undefined;
};

export class Config {
  private _sqlTables: SqlTables;
  private _values: IValues = {
    path: undefined,
    cachedWhen: undefined,
    isShown: undefined,
  };
  private _isShown: Set<string> | undefined; // if it's not in the database, or an empty string, then they're all shown

  constructor(sqlTables: SqlTables) {
    this._sqlTables = sqlTables;
    const pairs = sqlTables.getConfig();
    for (const pair of pairs) this._values[pair.name] = pair.value;
    if (this._values.isShown) this._isShown = new Set<string>(JSON.parse(this._values.isShown));
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

  setShown(names: string[]): void {
    const json = JSON.stringify(names);
    this.setValue("isShown", json);
    this._isShown = new Set<string>(names);
  }
  isShown(name: string): boolean {
    return !this._isShown ? true : this._isShown.has(name);
  }
}
