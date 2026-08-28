import { SqlDatabase } from "sqlio";
import { GraphOptions } from "../../contracts-ui";
import { ConfigCache } from "../../sqlConfig";
import { jsonParse } from "../../utils";
import { defaultViewOptions } from "./defaultViewOptions";

type GraphType = GraphOptions.LoadedGraphType;

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
      this.graphType = "references";
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

  set referenceViewOptions(viewOptions: GraphOptions.References) {
    this._cache.setValue("referenceViewOptions", JSON.stringify(viewOptions));
  }
  get referenceViewOptions(): GraphOptions.References {
    const value = this._cache.getValue("referenceViewOptions");
    return value
      ? { ...defaultViewOptions.referenceViewOptions, ...jsonParse(value) }
      : defaultViewOptions.referenceViewOptions;
  }

  set methodViewOptions(viewOptions: GraphOptions.Methods) {
    this._cache.setValue("methodViewOptions", JSON.stringify(viewOptions));
  }
  get methodViewOptions(): GraphOptions.Methods {
    const value = this._cache.getValue("methodViewOptions");
    return value
      ? { ...defaultViewOptions.methodViewOptions, ...jsonParse(value) }
      : defaultViewOptions.methodViewOptions;
  }

  set apiViewOptions(viewOptions: GraphOptions.Apis) {
    this._cache.setValue("apiViewOptions", JSON.stringify(viewOptions));
  }
  get apiViewOptions(): GraphOptions.Apis {
    const value = this._cache.getValue("apiViewOptions");
    return value ? { ...defaultViewOptions.apiViewOptions, ...jsonParse(value) } : defaultViewOptions.apiViewOptions;
  }

  set exes(names: string[]) {
    this._cache.setValue("exes", JSON.stringify(names));
  }
  get exes(): string[] {
    const value = this._cache.getValue("exes");
    return value ? jsonParse(value) : [];
  }

  get graphType(): GraphType {
    return (this._cache.getValue("graphType") as GraphType) ?? "references";
  }
  set graphType(value: GraphType) {
    this._cache.setValue("graphType", value);
  }
}
