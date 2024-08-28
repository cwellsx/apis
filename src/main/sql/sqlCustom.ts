import { Database } from "better-sqlite3";
import type { CustomError, CustomViewOptions, GraphFilter, NodeId, ViewType } from "../../shared-types";
import { nameNodeId } from "../../shared-types";
import { isAnyOtherCustomField, type CustomNode } from "../customJson";
import { log } from "../log";
import { options } from "../shared-types";
import { SqlTable } from "./sqlTable";

type ConfigColumns = {
  name: string;
  value: string;
};

export class SqlCustom {
  save: (nodes: CustomNode[], errors: CustomError[], when: string) => void;
  shouldReload: (when: string) => boolean;
  viewState: {
    onSave: (
      when: string,
      customSchemaVersion: string,
      nodeIds: NodeId[],
      customViewOptions: CustomViewOptions,
      isCheckModelAll: boolean
    ) => void;
    set customViewOptions(viewOptions: CustomViewOptions);
    get customViewOptions(): CustomViewOptions;
    get viewType(): ViewType;
    set viewType(value: ViewType);
    get cachedWhen(): string;
    get customSchemaVersion(): string;
  };
  readErrors: () => CustomError[];
  readAll: () => CustomNode[];
  close: () => void;
  private readLeafVisible: () => NodeId[];
  private writeLeafVisible: (leafVisible: NodeId[]) => void;
  private readGroupExpanded: (clusterBy: string[] | undefined) => NodeId[];
  private writeGroupExpanded: (clusterBy: string[] | undefined, groupExpanded: NodeId[]) => void;
  private readIsCheckModelAll: () => boolean;
  private writeIsCheckModelAll: (isCheckModelAll: boolean) => void;
  readGraphFilter: (clusterBy: string[] | undefined) => GraphFilter;
  writeGraphFilter: (clusterBy: string[] | undefined, graphFilter: GraphFilter) => void;

  constructor(db: Database) {
    const customSchemaVersionExpected = "2024-06-05";

    // even though the CustomNode elements each have a unique id
    // don't bother to store the data in normalized tables
    // because there isn't much of the data (it's hand-written)
    // also a schema mismatch doesn't drop and recreate the table
    const configTable = new SqlTable<ConfigColumns>(db, "configCustom", "name", () => false, {
      name: "foo",
      value: "bar",
    });

    configTable.deleteAll();

    const done = () => {
      const result = db.pragma("wal_checkpoint(TRUNCATE)");
      log(`wal_checkpoint: ${JSON.stringify(result)}`);
    };

    this.save = (nodes: CustomNode[], errors: CustomError[], when: string): void => {
      configTable.insert({ name: "nodes", value: JSON.stringify(nodes) });
      configTable.insert({ name: "errors", value: JSON.stringify(errors) });

      const nodeProperties = new Set<string>();
      nodes.forEach((node) =>
        Object.keys(node)
          .filter(isAnyOtherCustomField)
          .forEach((key) => nodeProperties.add(key))
      );

      const tags = new Set<string>();
      nodes.forEach((node) => node.tags?.forEach((tag) => tags.add(tag)));

      const ids = new Set<string>(nodes.map((node) => node.id));
      const layers = [...new Set<string>(nodes.map((node) => node.layer ?? ""))];
      const isAutoLayers = layers.some((layer) => ids.has(layer) && layer.includes("/"));

      const base = {
        tags: [...tags].sort().map((tag) => ({ tag, shown: true })),
        showEdgeLabels: {
          groups: false,
          leafs: false,
        },
      };

      const isCustomFolders = isAutoLayers && options.customFolders;
      const isCustomFolder = (node: CustomNode) => isCustomFolders && node.id == node.layer && false;

      const customViewOptions: CustomViewOptions = isAutoLayers
        ? { ...base, viewType: "custom", isAutoLayers, layers }
        : {
            ...base,
            viewType: "custom",
            isAutoLayers,
            nodeProperties: [...nodeProperties].sort(),
            clusterBy: [],
          };

      this.viewState.onSave(
        when,
        customSchemaVersionExpected,
        nodes.map((node) => nameNodeId(isCustomFolder(node) ? "customFolder" : "customLeaf", node.id)),
        customViewOptions,
        isCustomFolders
      );
      done();
    };

    this.shouldReload = (when: string): boolean =>
      !this.viewState.cachedWhen ||
      customSchemaVersionExpected !== this.viewState.customSchemaVersion ||
      Date.parse(this.viewState.cachedWhen) < Date.parse(when);

    this.readErrors = (): CustomError[] => {
      const o = configTable.selectOne({ name: "errors" });
      if (!o) throw new Error("Errors not initialized");
      return JSON.parse(o.value) as CustomError[];
    };

    this.readAll = (): CustomNode[] => {
      const o = configTable.selectOne({ name: "nodes" });
      if (!o) throw new Error("Nodes not initialized");
      return JSON.parse(o.value) as CustomNode[];
    };

    const keyGroupExpanded = (clusterBy: string[] | undefined): string =>
      clusterBy?.length ? "clusterBy-" + clusterBy.join("-") : "clusterBy";

    this.readLeafVisible = (): NodeId[] => {
      const found = configTable.selectOne({ name: "leafVisible" });
      if (!found) throw new Error("readLeafVisible nodes not found");
      return JSON.parse(found.value);
    };
    this.writeLeafVisible = (leafVisible: NodeId[]): void => {
      configTable.upsert({ name: "leafVisible", value: JSON.stringify(leafVisible) });
    };
    this.readGroupExpanded = (clusterBy: string[] | undefined): NodeId[] => {
      const found = configTable.selectOne({ name: keyGroupExpanded(clusterBy) });
      if (!found) return []; // not predefined so initially all closed
      return JSON.parse(found.value);
    };
    this.writeGroupExpanded = (clusterBy: string[] | undefined, groupExpanded: NodeId[]): void => {
      configTable.upsert({ name: keyGroupExpanded(clusterBy), value: JSON.stringify(groupExpanded) });
    };
    this.readIsCheckModelAll = (): boolean => {
      const found = configTable.selectOne({ name: "isCheckModelAll" });
      if (!found) throw new Error("readIsCheckModelAll nodes not found");
      return JSON.parse(found.value);
    };
    this.writeIsCheckModelAll = (isCheckModelAll: boolean): void => {
      configTable.upsert({ name: "isCheckModelAll", value: JSON.stringify(isCheckModelAll) });
    };
    this.readGraphFilter = (clusterBy: string[] | undefined): GraphFilter => ({
      leafVisible: this.readLeafVisible(),
      groupExpanded: this.readGroupExpanded(clusterBy),
      isCheckModelAll: this.readIsCheckModelAll(),
    });
    this.writeGraphFilter = (clusterBy: string[] | undefined, graphFilter: GraphFilter): void => {
      this.writeLeafVisible(graphFilter.leafVisible);
      this.writeGroupExpanded(clusterBy, graphFilter.groupExpanded);
      this.writeIsCheckModelAll(graphFilter.isCheckModelAll);
    };

    this.viewState = {
      onSave: (
        when: string,
        customSchemaVersion: string,
        nodeIds: NodeId[],
        customViewOptions: CustomViewOptions,
        isCheckModelAll: boolean
      ): void => {
        configTable.upsert({ name: "when", value: when });
        configTable.upsert({ name: "customSchemaVersion", value: customSchemaVersion });

        this.viewState.customViewOptions = customViewOptions;

        this.writeLeafVisible(nodeIds);
        this.writeIsCheckModelAll(isCheckModelAll);
      },
      set customViewOptions(viewOptions: CustomViewOptions) {
        configTable.upsert({ name: "viewOptions", value: JSON.stringify(viewOptions) });
      },
      get customViewOptions(): CustomViewOptions {
        const o = configTable.selectOne({ name: "viewOptions" });
        if (!o) throw new Error("viewOptions not initialized");
        return JSON.parse(o.value) as CustomViewOptions;
      },
      get viewType(): ViewType {
        const o = configTable.selectOne({ name: "viewType" });
        if (!o) return "custom";
        return o.value as ViewType;
      },
      set viewType(value: ViewType) {
        configTable.upsert({ name: "viewType", value });
      },
      get cachedWhen(): string {
        const o = configTable.selectOne({ name: "when" });
        if (!o) return "";
        return o.value;
      },
      get customSchemaVersion(): string {
        const o = configTable.selectOne({ name: "customSchemaVersion" });
        if (!o) return "";
        return o.value;
      },
    };

    this.close = () => {
      done();
      db.close();
    };
  }
}
