import { Database } from "better-sqlite3";
import { ApiViewOptions, MethodViewOptions, ReferenceViewOptions, ViewType } from "../../shared-types";
import { ConfigCache } from "./configCache";
import { defaultApiViewOptions, defaultMethodViewOptions, defaultReferenceViewOptions } from "./defaultViewOptions";

export class ViewState {
  private _cache: ConfigCache;

  constructor(db: Database) {
    this._cache = new ConfigCache(db);
  }

  onSave(when: string, hashDataSource: string, version: string, exes: string[]) {
    this.cachedWhen = when;
    this.hashDataSource = hashDataSource;
    this.loadedVersion = version;
    this.exes = exes;
    this.referenceViewOptions = defaultReferenceViewOptions;
    this.methodViewOptions = defaultMethodViewOptions;
    this.apiViewOptions = defaultApiViewOptions;
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
  // this identifies the DataSource
  get hashDataSource(): string {
    return this._cache.getValue("hashDataSource") ?? "";
  }
  set hashDataSource(value: string) {
    this._cache.setValue("hashDataSource", value);
  }

  set referenceViewOptions(viewOptions: ReferenceViewOptions) {
    this._cache.setValue("referenceViewOptions", JSON.stringify(viewOptions));
  }
  get referenceViewOptions(): ReferenceViewOptions {
    const value = this._cache.getValue("referenceViewOptions");
    return value ? { defaultReferenceViewOptions, ...JSON.parse(value) } : defaultReferenceViewOptions;
  }

  set methodViewOptions(viewOptions: MethodViewOptions) {
    this._cache.setValue("methodViewOptions", JSON.stringify(viewOptions));
  }
  get methodViewOptions(): MethodViewOptions {
    const value = this._cache.getValue("methodViewOptions");
    return value ? { ...defaultMethodViewOptions, ...JSON.parse(value) } : defaultMethodViewOptions;
  }

  set apiViewOptions(viewOptions: ApiViewOptions) {
    this._cache.setValue("apiViewOptions", JSON.stringify(viewOptions));
  }
  get apiViewOptions(): ApiViewOptions {
    const value = this._cache.getValue("apiViewOptions");
    return value ? { defaultApiViewOptions, ...JSON.parse(value) } : defaultApiViewOptions;
  }

  set exes(names: string[]) {
    this._cache.setValue("exes", JSON.stringify(names));
  }
  get exes(): string[] {
    const value = this._cache.getValue("exes");
    return value ? JSON.parse(value) : [];
  }

  get viewType(): ViewType {
    return (this._cache.getValue("viewType") as ViewType) ?? "references";
  }
  set viewType(value: ViewType) {
    this._cache.setValue("viewType", value);
  }
}
