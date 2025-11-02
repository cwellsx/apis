import { SqlDatabase } from "sqlio";
import {
  ApiViewOptions,
  CompilerViewOptions,
  MethodViewOptions,
  ReferenceViewOptions,
  ViewType,
} from "../contracts-ui";
import { jsonParse } from "../utils";
import { ConfigCache } from "./configCache";
import { defaultViewOptions } from "./defaultViewOptions";

export class ViewState {
  private _cache: ConfigCache;

  constructor(db: SqlDatabase) {
    this._cache = new ConfigCache(db);
  }

  onSave(when: string, version: string, exes: string[], isSchemaChanged: boolean) {
    this.cachedWhen = when;
    this.loadedVersion = version;
    this.exes = exes;
    this.referenceViewOptions = defaultViewOptions.referenceViewOptions;
    this.methodViewOptions = defaultViewOptions.methodViewOptions;
    this.apiViewOptions = defaultViewOptions.apiViewOptions;

    if (isSchemaChanged) {
      this.viewType = "references";
      this.compilerViewOptions = defaultViewOptions.compilerViewOptions;
    }
  }

  // this changes when the SQL schema definition changes
  get loadedSchemaVersion(): string | undefined {
    return this._cache.getValue("loadedSchemaVersion");
  }
  set loadedSchemaVersion(value: string | undefined) {
    this._cache.setValue("loadedSchemaVersion", value);
  }
  // this changes when the format of Reflected data changes
  get loadedVersion(): string {
    return this._cache.getValue("loadedVersion") ?? "";
  }
  set loadedVersion(value: string) {
    this._cache.setValue("loadedVersion", value);
  }
  // this changes when the data source (e.g. the assemblies being inspected) changes
  get cachedWhen(): string {
    return this._cache.getValue("cachedWhen") ?? "";
  }
  set cachedWhen(value: string) {
    this._cache.setValue("cachedWhen", value);
  }

  set referenceViewOptions(viewOptions: ReferenceViewOptions) {
    this._cache.setValue("referenceViewOptions", JSON.stringify(viewOptions));
  }
  get referenceViewOptions(): ReferenceViewOptions {
    const value = this._cache.getValue("referenceViewOptions");
    return value
      ? { ...defaultViewOptions.referenceViewOptions, ...jsonParse(value) }
      : defaultViewOptions.referenceViewOptions;
  }

  set methodViewOptions(viewOptions: MethodViewOptions) {
    this._cache.setValue("methodViewOptions", JSON.stringify(viewOptions));
  }
  get methodViewOptions(): MethodViewOptions {
    const value = this._cache.getValue("methodViewOptions");
    return value
      ? { ...defaultViewOptions.methodViewOptions, ...jsonParse(value) }
      : defaultViewOptions.methodViewOptions;
  }

  set apiViewOptions(viewOptions: ApiViewOptions) {
    this._cache.setValue("apiViewOptions", JSON.stringify(viewOptions));
  }
  get apiViewOptions(): ApiViewOptions {
    const value = this._cache.getValue("apiViewOptions");
    return value ? { ...defaultViewOptions.apiViewOptions, ...jsonParse(value) } : defaultViewOptions.apiViewOptions;
  }

  set compilerViewOptions(viewOptions: CompilerViewOptions) {
    this._cache.setValue("compilerViewOptions", JSON.stringify(viewOptions));
  }
  get compilerViewOptions(): CompilerViewOptions {
    const value = this._cache.getValue("compilerViewOptions");
    return value
      ? { ...defaultViewOptions.compilerViewOptions, ...jsonParse(value) }
      : defaultViewOptions.compilerViewOptions;
  }

  set exes(names: string[]) {
    this._cache.setValue("exes", JSON.stringify(names));
  }
  get exes(): string[] {
    const value = this._cache.getValue("exes");
    return value ? jsonParse(value) : [];
  }

  get viewType(): ViewType {
    return (this._cache.getValue("viewType") as ViewType) ?? "references";
  }
  set viewType(value: ViewType) {
    this._cache.setValue("viewType", value);
  }
}
